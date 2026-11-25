"""People, and who added and last changed each record.

Adds `users` with the reserved "Sample data" person, and `created_by` / `updated_by`
on organizations, contacts, deals and activities. Every record already there came
from the sample data, so it's credited to that person (concern 18). On Postgres,
turns on row-level security for every table, so Supabase's Data API serves nothing
(concern 20).

Revision ID: 0002
Revises: 0001
"""

from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

SAMPLE_DATA_USER_ID = "sample-data"
RECORD_TABLES = ("organizations", "contacts", "deals", "activities")


def _add_who_added_columns(table: str) -> None:
    # Nullable first, so the existing rows can be credited, then required.
    with op.batch_alter_table(table) as batch:
        batch.add_column(sa.Column("created_by", sa.Text()))
        batch.add_column(sa.Column("updated_by", sa.Text()))
    op.execute(
        sa.table(table, sa.column("created_by"), sa.column("updated_by"))
        .update()
        .values(created_by=SAMPLE_DATA_USER_ID, updated_by=SAMPLE_DATA_USER_ID)
    )
    with op.batch_alter_table(table) as batch:
        batch.alter_column("created_by", existing_type=sa.Text(), nullable=False)
        batch.alter_column("updated_by", existing_type=sa.Text(), nullable=False)
        batch.create_foreign_key(f"{table}_created_by_fkey", "users", ["created_by"], ["id"], ondelete="RESTRICT")
        batch.create_foreign_key(f"{table}_updated_by_fkey", "users", ["updated_by"], ["id"], ondelete="RESTRICT")


def _turn_on_row_level_security() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in ("users", *RECORD_TABLES, "alembic_version"):
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')


def upgrade() -> None:
    users = op.create_table(
        "users",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    now = datetime.now(UTC).replace(tzinfo=None)
    op.bulk_insert(
        users, [{"id": SAMPLE_DATA_USER_ID, "name": "Sample data", "email": None, "created_at": now, "updated_at": now}]
    )
    for table in RECORD_TABLES:
        _add_who_added_columns(table)
    _turn_on_row_level_security()
