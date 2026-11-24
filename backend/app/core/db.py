"""The engine, and one database transaction per request."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Connection, Engine, create_engine, event

from app.core.tables import metadata


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


def create_tables(engine: Engine) -> None:
    metadata.create_all(engine)


def get_conn(request: Request) -> Iterator[Connection]:
    """Open one transaction for the request. It commits when the route returns
    and rolls back if the route raises."""
    with request.app.state.engine.begin() as conn:
        yield conn


# scope="function" ends the transaction before the response is sent, so a
# client never sees success for a change that then fails to commit.
Conn = Annotated[Connection, Depends(get_conn, scope="function")]
