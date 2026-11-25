"""Who added and last changed a record (R56): the values to save, and the names to show (R57)."""

from sqlalchemy import Table
from sqlalchemy.sql import FromClause

from app.core.auth import User
from app.core.tables import users

_creator = users.alias("creator")
_updater = users.alias("updater")


def added_by(user: User) -> dict:
    return {"created_by": user.id, "updated_by": user.id}


def changed_by(user: User) -> dict:
    return {"updated_by": user.id}


def names() -> list:
    """The two names, for the select list of a query joined with join_names()."""
    return [_creator.c.name.label("created_by_name"), _updater.c.name.label("updated_by_name")]


def join_names(source: FromClause, table: Table) -> FromClause:
    """`source` joined with the people who added and last changed `table`'s rows."""
    return source.join(_creator, table.c.created_by == _creator.c.id).join(
        _updater, table.c.updated_by == _updater.c.id
    )
