"""All the tables, in one place.

Timestamps are stored in UTC and come back as UTC-aware datetimes. Plain dates
(close_date, follow_up_date) are stored as dates.
"""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Table,
    Text,
    false,
)
from sqlalchemy.types import TypeDecorator


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator):
    """Stores datetimes as naive UTC, and returns them UTC-aware. A naive
    datetime passed in is taken to be UTC already."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            value = value.astimezone(UTC).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            value = value.replace(tzinfo=UTC)
        return value


def _same_as_created(context) -> datetime:
    """A new row's updated_at is exactly its created_at, so "changed since it was added"
    means updated_at moved on (R57)."""
    return context.get_current_parameters()["created_at"]


def _timestamps() -> list[Column]:
    return [
        Column("created_at", UTCDateTime, nullable=False, default=utcnow),
        Column("updated_at", UTCDateTime, nullable=False, default=_same_as_created, onupdate=utcnow),
    ]


def _who_added() -> list[Column]:
    """Who added the record and who last changed it (R56). A person's row is never
    deleted, so their records keep their name."""
    return [
        Column("created_by", Text, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        Column("updated_by", Text, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
    ]


# The reserved person the sample data is credited to (concern 18).
SAMPLE_DATA_USER_ID = "sample-data"
SAMPLE_DATA_USER_NAME = "Sample data"

metadata = MetaData()

# Everyone who has signed in, kept from their token (R55), plus the sample data's person.
users = Table(
    "users",
    metadata,
    Column("id", Text, primary_key=True),
    Column("name", Text, nullable=False),
    Column("email", Text),
    *_timestamps(),
)

organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False),
    Column("website", Text),
    Column("industry", Text),
    Column("notes", Text),
    *_timestamps(),
    *_who_added(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("first_name", Text, nullable=False),
    Column("last_name", Text, nullable=False),
    Column("email", Text),
    Column("phone", Text),
    Column("job_title", Text),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True),
    Column("status", Text, nullable=False),
    *_timestamps(),
    *_who_added(),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", Text, nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="SET NULL"), index=True),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="SET NULL"), index=True),
    Column("stage", Text, nullable=False),
    Column("value", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("close_date", Date, nullable=False),
    Column("position", Integer, nullable=False),
    Column("notes", Text),
    *_timestamps(),
    *_who_added(),
    CheckConstraint("value >= 0", name="deal_value_not_negative"),
    CheckConstraint("probability BETWEEN 0 AND 100", name="deal_probability_range"),
    Index("deals_stage_position", "stage", "position"),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", Text, nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id", ondelete="CASCADE"), index=True),
    Column("deal_id", Integer, ForeignKey("deals.id", ondelete="CASCADE"), index=True),
    Column("description", Text, nullable=False),
    Column("occurred_at", UTCDateTime, nullable=False),
    Column("follow_up_date", Date),
    Column("done", Boolean, nullable=False, default=False, server_default=false()),
    Column("from_stage", Text),
    Column("to_stage", Text),
    *_timestamps(),
    *_who_added(),
    # Every activity belongs to exactly one contact or exactly one deal (concern 5).
    CheckConstraint("(contact_id IS NULL) <> (deal_id IS NULL)", name="activity_has_one_owner"),
)
