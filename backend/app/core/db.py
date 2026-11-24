"""The engine, and one database transaction per request."""

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import Connection, Engine, Table, create_engine, event, insert

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
