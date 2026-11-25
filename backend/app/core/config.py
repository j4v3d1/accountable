"""Settings read from the environment (concern 23): the database, the sign-in mode,
the Supabase project, the hosts the API answers, and today's date.

Nothing here reads `.env`. Only `npm start` and `npm run seed:live` load it, into
the environment, before the backend starts.
"""

import os
from datetime import date
from pathlib import Path
from typing import Literal

from sqlalchemy.engine import URL, make_url

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_PATH = BACKEND_DIR / "data" / "accountable.db"
FRONTEND_DIST_DIR = BACKEND_DIR.parent / "frontend" / "dist"

AuthMode = Literal["supabase", "local"]

# The API only answers requests addressed to this computer, or on Render its own
# hostname, so a web page can't reach it by pointing its own domain name at it
# (DNS rebinding, concern 22).
LOCAL_HOSTS = ["localhost", "127.0.0.1"]


class SettingsError(Exception):
    """A setting is missing or doesn't fit the others, so the backend won't start."""


def database_url() -> str:
    """The SQLAlchemy URL from DATABASE_URL, or the default SQLite file.

    Supabase gives a `postgresql://` address; SQLAlchemy needs to be told to use psycopg 3.
    """
    url = os.environ.get("DATABASE_URL")
    if url:
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url
    DEFAULT_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return URL.create("sqlite", database=str(DEFAULT_DATABASE_PATH)).render_as_string()


def is_sqlite(url: str) -> bool:
    return make_url(url).get_backend_name() == "sqlite"


def auth_mode() -> AuthMode:
    """`supabase` (the default) or `local`, from ACCOUNTABLE_AUTH (concern 16)."""
    mode = os.environ.get("ACCOUNTABLE_AUTH", "supabase")
    if mode == "local":
        return "local"
    if mode == "supabase":
        return "supabase"
    raise SettingsError(f"ACCOUNTABLE_AUTH must be supabase or local, not {mode!r}")


def supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


def supabase_publishable_key() -> str:
    return os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")


def check_settings() -> None:
    """Refuse to start with settings that don't fit together (concern 16)."""
    if auth_mode() == "local":
        if not is_sqlite(database_url()):
            raise SettingsError(
                "Local sign-in only runs against a SQLite database. Unset DATABASE_URL or ACCOUNTABLE_AUTH."
            )
        return
    missing = [name for name in ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY") if not os.environ.get(name)]
    if missing:
        raise SettingsError(f"Supabase sign-in needs {' and '.join(missing)}. Set them, or use ACCOUNTABLE_AUTH=local.")


def allowed_hosts() -> list[str]:
    """This computer, plus the hostname Render gives the app, when there is one."""
    render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
    return [*LOCAL_HOSTS, render_host] if render_host else list(LOCAL_HOSTS)


def today() -> date:
    """Today's date. Tests fix it with ACCOUNTABLE_TODAY (YYYY-MM-DD)."""
    fixed = os.environ.get("ACCOUNTABLE_TODAY")
    if fixed:
        return date.fromisoformat(fixed)
    return date.today()
