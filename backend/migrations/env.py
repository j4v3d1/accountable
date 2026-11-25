"""Runs the migrations (R65) on the connection run_migrations() hands over, or, when
Alembic is run by hand, on the database DATABASE_URL names."""

from alembic import context

from app.core import config
from app.core.db import make_engine


def _run(connection) -> None:
    # Batch mode rebuilds a table to change a column, since SQLite can't alter one in place.
    context.configure(connection=connection, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


connection = context.config.attributes.get("connection")
if connection is not None:
    _run(connection)
else:
    engine = make_engine(config.database_url())
    with engine.begin() as own_connection:
        _run(own_connection)
    engine.dispose()
