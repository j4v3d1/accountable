"""The migrations (R65): a new database, a database made before migrations, and running twice."""

from datetime import UTC, date, datetime

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import MetaData, Table, inspect, text

from app.core.config import BACKEND_DIR
from app.core.db import make_engine, run_migrations
from app.core.tables import SAMPLE_DATA_USER_ID, metadata
from app.main import create_app
from conftest import sign_in

NOW = datetime(2026, 11, 1, 9, tzinfo=UTC).replace(tzinfo=None)


@pytest.fixture
def engine(test_env):
    engine = make_engine(test_env)
    yield engine
    engine.dispose()


def schema(engine) -> dict:
    found = inspect(engine)
    return {
        name: {
            "columns": {c["name"]: (str(c["type"]), c["nullable"]) for c in found.get_columns(name)},
            "foreign_keys": sorted(
                (tuple(fk["constrained_columns"]), fk["referred_table"], fk["options"].get("ondelete"))
                for fk in found.get_foreign_keys(name)
            ),
            "indexes": sorted(index["name"] for index in found.get_indexes(name)),
            "checks": sorted(check["name"] for check in found.get_check_constraints(name)),
        }
        for name in found.get_table_names()
    }


def make_database_the_old_way(engine) -> None:
    """The four tables as they were before migrations, with no record of migrations."""
    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    with engine.begin() as conn:
        alembic_config.attributes["connection"] = conn
        command.upgrade(alembic_config, "0001")
        conn.execute(text("DROP TABLE alembic_version"))


def add_linked_records(engine, **credit) -> None:
    """Rows written straight into the tables the database has, as an older app would have."""
    stamps = {"created_at": NOW, "updated_at": NOW, **credit}
    with engine.begin() as conn:

        def table(name: str) -> Table:
            return Table(name, MetaData(), autoload_with=conn)

        conn.execute(table("organizations").insert(), [{"id": 1, "name": "Harbor Point Lending", **stamps}])
        conn.execute(
            table("contacts").insert(),
            [
                {
                    "id": 1,
                    "first_name": "Laura",
                    "last_name": "Mendes",
                    "organization_id": 1,
                    "status": "customer",
                    **stamps,
                }
            ],
        )
        deal = {"id": 1, "name": "7 Meadow Ln purchase", "contact_id": 1, "organization_id": 1, "stage": "offer"}
        conn.execute(
            table("deals").insert(),
            [{**deal, "value": 689000, "probability": 60, "close_date": date(2027, 1, 5), "position": 0, **stamps}],
        )
        activity = {"type": "note", "description": "Wants a 30-day close", "occurred_at": NOW, "done": False}
        conn.execute(
            table("activities").insert(),
            [
                {"id": 1, "deal_id": 1, "contact_id": None, **activity, **stamps},
                {"id": 2, "deal_id": None, "contact_id": 1, **activity, **stamps},
            ],
        )


def test_a_new_database_gets_every_table_from_the_migrations(engine):
    run_migrations(engine)

    tables = schema(engine)
    assert set(tables) == {"alembic_version", *metadata.tables}
    for name, model in metadata.tables.items():
        assert set(tables[name]["columns"]) == {column.name for column in model.columns}, name
        for column in model.columns:
            assert tables[name]["columns"][column.name][1] == column.nullable, f"{name}.{column.name}"


def test_the_migrations_match_the_tables_in_tables_py(engine, tmp_path):
    run_migrations(engine)
    from_metadata = make_engine(f"sqlite:///{tmp_path / 'metadata.db'}")
    metadata.create_all(from_metadata)

    migrated, declared = schema(engine), schema(from_metadata)
    from_metadata.dispose()

    for name in metadata.tables:
        assert migrated[name]["foreign_keys"] == declared[name]["foreign_keys"], name
        assert migrated[name]["indexes"] == declared[name]["indexes"], name
        assert migrated[name]["checks"] == declared[name]["checks"], name


def test_a_database_made_the_old_way_keeps_every_row_and_link(engine):
    make_database_the_old_way(engine)
    add_linked_records(engine)

    run_migrations(engine)

    with engine.connect() as conn:
        assert conn.execute(text("SELECT organization_id FROM contacts")).scalars().all() == [1]
        assert conn.execute(text("SELECT contact_id, organization_id FROM deals")).all() == [(1, 1)]
        assert conn.execute(text("SELECT id FROM activities ORDER BY id")).scalars().all() == [1, 2]
        assert conn.execute(text("SELECT version_num FROM alembic_version")).scalars().all() == ["0002"]
        assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1


def test_a_database_made_the_old_way_is_credited_to_sample_data(engine):
    make_database_the_old_way(engine)
    add_linked_records(engine)

    run_migrations(engine)

    with engine.connect() as conn:
        for name in ("organizations", "contacts", "deals", "activities"):
            credits = conn.execute(text(f"SELECT DISTINCT created_by, updated_by FROM {name}")).all()
            assert credits == [(SAMPLE_DATA_USER_ID, SAMPLE_DATA_USER_ID)], name
        assert conn.execute(text("SELECT name FROM users")).scalars().all() == ["Sample data"]


def test_after_the_migration_the_old_records_show_sample_data_in_the_app(engine, test_env):
    make_database_the_old_way(engine)
    add_linked_records(engine)

    with TestClient(create_app(), base_url="http://localhost") as client:
        client.headers.update(sign_in(client))
        deal = client.get("/api/deals/1").json()

    assert (deal["created_by_name"], deal["updated_by_name"]) == ("Sample data", "Sample data")
    assert deal["contact_name"] == "Laura Mendes"
    assert [entry["created_by_name"] for entry in deal["timeline"]] == ["Sample data"]


def test_running_the_migrations_twice_changes_nothing(engine):
    run_migrations(engine)
    add_linked_records(engine, created_by=SAMPLE_DATA_USER_ID, updated_by=SAMPLE_DATA_USER_ID)
    before = schema(engine)

    run_migrations(engine)

    assert schema(engine) == before
    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM users")).scalar() == 1
        assert conn.execute(text("SELECT count(*) FROM activities")).scalar() == 2
