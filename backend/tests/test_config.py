from datetime import date
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core import config

BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_database_url_comes_from_the_environment(monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_DATABASE_URL", "sqlite:///somewhere/else.db")

    assert config.database_url() == "sqlite:///somewhere/else.db"


def test_default_database_is_found_from_the_backend_folder_whatever_the_working_folder(
    monkeypatch, tmp_path
):
    monkeypatch.delenv("ACCOUNTABLE_DATABASE_URL")
    monkeypatch.chdir(tmp_path)

    url = make_url(config.database_url())

    assert url.drivername == "sqlite"
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
