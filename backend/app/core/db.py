"""The engine, the migrations, and one database transaction per request."""

from collections.abc import Iterator
from typing import Annotated

from alembic import command
from alembic.config import Config
from fastapi import Depends, Request
from sqlalchemy import Connection, Engine, Table, create_engine, event, insert, inspect

from app.core.config import BACKEND_DIR

BASELINE_REVISION = "0001"


def make_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _foreign_keys_on(dbapi_connection, _record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys = ON")
            cursor.close()

        return engine
    return create_engine(url)


def _made_before_migrations(conn: Connection) -> bool:
    tables = inspect(conn).get_table_names()
    return "organizations" in tables and "alembic_version" not in tables


def run_migrations(engine: Engine) -> None:
    """Bring the database up to the latest migration (R65). A database made before
    migrations existed is marked as at the baseline first, so its data is kept."""
    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    with engine.connect() as conn:
        sqlite = conn.dialect.name == "sqlite"
        # SQLite rebuilds a table to change a column. With foreign keys on, dropping the
        # old copy would unlink or delete the rows that point at it. Set outside a transaction.
        if sqlite:
            conn.exec_driver_sql("PRAGMA foreign_keys = OFF")
        try:
            alembic_config.attributes["connection"] = conn
            if _made_before_migrations(conn):
                command.stamp(alembic_config, BASELINE_REVISION)
            command.upgrade(alembic_config, "head")
            conn.commit()
        finally:
            conn.rollback()
            if sqlite:
                conn.exec_driver_sql("PRAGMA foreign_keys = ON")
                conn.commit()


def insert_row(conn: Connection, table: Table, **values) -> int:
    """Insert one row and return its new id."""
    primary_key = conn.execute(insert(table).values(**values)).inserted_primary_key
    if primary_key is None:
        raise RuntimeError(f"Inserting into {table.name} gave back no id")
    return primary_key[0]


def get_conn(request: Request) -> Iterator[Connection]:
    """Open one transaction for the request. It commits when the route returns
    and rolls back if the route raises."""
    with request.app.state.engine.begin() as conn:
        yield conn


# scope="function" ends the transaction before the response is sent, so a
# client never sees success for a change that then fails to commit.
Conn = Annotated[Connection, Depends(get_conn, scope="function")]
