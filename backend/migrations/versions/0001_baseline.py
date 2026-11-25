"""The baseline: the four tables as they were before migrations (R65).

A database made before this, such as an existing local file, already has them and
is marked as at this revision without running it (db.run_migrations).

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("website", sa.Text()),
        sa.Column("industry", sa.Text()),
        sa.Column("notes", sa.Text()),
        *_timestamps(),
    )
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("first_name", sa.Text(), nullable=False),
        sa.Column("last_name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text()),
        sa.Column("phone", sa.Text()),
        sa.Column("job_title", sa.Text()),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="SET NULL")),
        sa.Column("status", sa.Text(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_contacts_organization_id", "contacts", ["organization_id"])
    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id", ondelete="SET NULL")),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="SET NULL")),
        sa.Column("stage", sa.Text(), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("probability", sa.Integer(), nullable=False),
        sa.Column("close_date", sa.Date(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text()),
        *_timestamps(),
        sa.CheckConstraint("value >= 0", name="deal_value_not_negative"),
        sa.CheckConstraint("probability BETWEEN 0 AND 100", name="deal_probability_range"),
    )
    op.create_index("ix_deals_contact_id", "deals", ["contact_id"])
    op.create_index("ix_deals_organization_id", "deals", ["organization_id"])
    op.create_index("deals_stage_position", "deals", ["stage", "position"])
    op.create_table(
        "activities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("contact_id", sa.Integer(), sa.ForeignKey("contacts.id", ondelete="CASCADE")),
        sa.Column("deal_id", sa.Integer(), sa.ForeignKey("deals.id", ondelete="CASCADE")),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("follow_up_date", sa.Date()),
        sa.Column("done", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("from_stage", sa.Text()),
        sa.Column("to_stage", sa.Text()),
        *_timestamps(),
        sa.CheckConstraint("(contact_id IS NULL) <> (deal_id IS NULL)", name="activity_has_one_owner"),
    )
    op.create_index("ix_activities_contact_id", "activities", ["contact_id"])
    op.create_index("ix_activities_deal_id", "activities", ["deal_id"])
