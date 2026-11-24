"""Settings read from the environment: the database URL and today's date."""

import os
from datetime import date
from pathlib import Path

from sqlalchemy.engine import URL

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = BACKEND_DIR / "data" / "accountable.db"

# The API only answers requests addressed to this computer, so a web page can't
# reach it by pointing its own domain name at 127.0.0.1 (DNS rebinding).
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]


def database_url() -> str:
    """The SQLAlchemy URL from ACCOUNTABLE_DATABASE_URL, or the default SQLite file."""
    url = os.environ.get("ACCOUNTABLE_DATABASE_URL")
    if url:
        return url
    DEFAULT_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return URL.create("sqlite", database=str(DEFAULT_DATABASE_PATH)).render_as_string()


def today() -> date:
    """Today's date. Tests fix it with ACCOUNTABLE_TODAY (YYYY-MM-DD)."""
    fixed = os.environ.get("ACCOUNTABLE_TODAY")
    if fixed:
        return date.fromisoformat(fixed)
    return date.today()
