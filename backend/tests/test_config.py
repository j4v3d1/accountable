import sys
from datetime import date
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

from app.core import config

BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_database_url_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///somewhere/else.db")

    assert config.database_url() == "sqlite:///somewhere/else.db"


def test_default_database_is_found_from_the_backend_folder_whatever_the_working_folder(monkeypatch, tmp_path):
    monkeypatch.delenv("DATABASE_URL")
    monkeypatch.chdir(tmp_path)

    url = make_url(config.database_url())

    assert url.drivername == "sqlite"
    assert url.database is not None
    assert Path(url.database) == BACKEND_DIR / "data" / "accountable.db"
    assert (BACKEND_DIR / "data").is_dir()


def test_the_default_database_is_not_used_under_test(client):
    engine_path = Path(client.app.state.engine.url.database)

    assert engine_path != BACKEND_DIR / "data" / "accountable.db"
    assert not engine_path.is_relative_to(BACKEND_DIR)


def test_today_can_be_fixed_for_tests(monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2027-01-03")

    assert config.today() == date(2027, 1, 3)


def test_today_is_the_real_date_when_not_fixed(monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_TODAY")

    assert config.today() == date.today()


def test_a_postgres_address_from_supabase_uses_the_psycopg_driver(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres.ref:pw@pooler.supabase.example:5432/postgres")

    assert config.database_url() == "postgresql+psycopg://postgres.ref:pw@pooler.supabase.example:5432/postgres"


def test_sign_in_is_supabase_unless_set_to_local(monkeypatch):
    monkeypatch.delenv("ACCOUNTABLE_AUTH")
    assert config.auth_mode() == "supabase"

    monkeypatch.setenv("ACCOUNTABLE_AUTH", "local")
    assert config.auth_mode() == "local"

    monkeypatch.setenv("ACCOUNTABLE_AUTH", "none")
    with pytest.raises(config.SettingsError, match="supabase or local"):
        config.auth_mode()


def test_local_sign_in_refuses_a_database_that_is_not_sqlite(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:pw@db.supabase.example:5432/postgres")

    with pytest.raises(config.SettingsError, match="SQLite"):
        config.check_settings()


def test_local_sign_in_starts_against_sqlite():
    config.check_settings()


@pytest.mark.parametrize(
    ("present", "named"),
    [
        ({}, "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY"),
        ({"SUPABASE_URL": "https://ref.supabase.example"}, "SUPABASE_PUBLISHABLE_KEY"),
        ({"SUPABASE_PUBLISHABLE_KEY": "sb_publishable_x"}, "SUPABASE_URL"),
    ],
)
def test_supabase_sign_in_without_its_settings_refuses_and_names_them(monkeypatch, present, named):
    monkeypatch.setenv("ACCOUNTABLE_AUTH", "supabase")
    for name, value in present.items():
        monkeypatch.setenv(name, value)

    with pytest.raises(config.SettingsError, match=f"needs {named}\\."):
        config.check_settings()


def test_the_app_refuses_to_start_with_settings_that_do_not_fit(monkeypatch):
    from app.main import create_app

    monkeypatch.setenv("ACCOUNTABLE_AUTH", "supabase")

    with pytest.raises(config.SettingsError):
        create_app()


def test_supabase_sign_in_with_its_settings_starts(monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_AUTH", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://ref.supabase.example/")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x")

    config.check_settings()
    assert config.supabase_url() == "https://ref.supabase.example"


def test_nothing_in_the_backend_reads_dot_env(monkeypatch, tmp_path):
    # A filled-in .env where a command might run must change nothing (concern 23).
    (tmp_path / ".env").write_text(
        "DATABASE_URL=postgresql://postgres:pw@db.supabase.example:5432/postgres\nACCOUNTABLE_AUTH=supabase\n"
    )
    monkeypatch.chdir(tmp_path)

    import app.main

    assert app.main.app is not None
    assert config.is_sqlite(config.database_url())
    assert config.auth_mode() == "local"
    assert "dotenv" not in sys.modules
