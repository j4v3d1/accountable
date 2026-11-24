"""Activities: create, update and delete, the stage-change log and the timelines."""

from sqlalchemy import Connection, delete, exists, insert, or_, select, update

from app.activities.schemas import ActivityCreate
from app.core.db import insert_row
from app.core.errors import Conflict, Invalid, NotFound
from app.core.tables import activities, contacts, deals, utcnow
from app.deals.stages import BY_KEY

NEWEST_FIRST = (activities.c.occurred_at.desc(), activities.c.id.desc())


def _select():
    contact_name = (contacts.c.first_name + " " + contacts.c.last_name).label("contact_name")
    return select(activities, contact_name, deals.c.name.label("deal_name")).select_from(
        activities.outerjoin(contacts, activities.c.contact_id == contacts.c.id).outerjoin(
            deals, activities.c.deal_id == deals.c.id
        )
    )


def get_activity(conn: Connection, activity_id: int) -> dict:
    row = conn.execute(_select().where(activities.c.id == activity_id)).mappings().first()
    if row is None:
        raise NotFound("Activity not found")
    return dict(row)


def timeline_for_deal(conn: Connection, deal_id: int) -> list[dict]:
    query = _select().where(activities.c.deal_id == deal_id).order_by(*NEWEST_FIRST)
    return [dict(row) for row in conn.execute(query).mappings()]


def timeline_for_contact(conn: Connection, contact_id: int) -> list[dict]:
    """The contact's own activities, plus those of deals where they are the main contact (concern 5)."""
    their_deals = select(deals.c.id).where(deals.c.contact_id == contact_id)
    query = (
        _select()
        .where(or_(activities.c.contact_id == contact_id, activities.c.deal_id.in_(their_deals)))
        .order_by(*NEWEST_FIRST)
    )
    return [dict(row) for row in conn.execute(query).mappings()]


def latest(conn: Connection, limit: int) -> list[dict]:
    return [dict(row) for row in conn.execute(_select().order_by(*NEWEST_FIRST).limit(limit)).mappings()]


def create_activity(conn: Connection, data: ActivityCreate) -> dict:
    if data.contact_id is not None and not conn.scalar(select(exists().where(contacts.c.id == data.contact_id))):
        raise Invalid("contact_id", "That contact doesn't exist", data.contact_id)
    if data.deal_id is not None and not conn.scalar(select(exists().where(deals.c.id == data.deal_id))):
        raise Invalid("deal_id", "That deal doesn't exist", data.deal_id)
    values = data.model_dump()
    values["occurred_at"] = values["occurred_at"] or utcnow()
    activity_id = insert_row(conn, activities, **values)
    return get_activity(conn, activity_id)


def _editable(conn: Connection, activity_id: int) -> None:
    kind = conn.scalar(select(activities.c.type).where(activities.c.id == activity_id))
    if kind is None:
        raise NotFound("Activity not found")
    if kind == "stage_change":
        raise Conflict("Stage changes are recorded automatically and can't be edited or deleted")


def update_activity(conn: Connection, activity_id: int, changes: dict) -> dict:
    _editable(conn, activity_id)
    if changes:
        conn.execute(update(activities).where(activities.c.id == activity_id).values(**changes))
    return get_activity(conn, activity_id)


def delete_activity(conn: Connection, activity_id: int) -> None:
    _editable(conn, activity_id)
    conn.execute(delete(activities).where(activities.c.id == activity_id))


def log_stage_change(conn: Connection, deal_id: int, from_stage: str, to_stage: str) -> None:
    """R19: every stage change creates one entry, such as "Moved from Showing to Offer"."""
    conn.execute(
        insert(activities).values(
            type="stage_change",
            deal_id=deal_id,
            description=f"Moved from {BY_KEY[from_stage].label} to {BY_KEY[to_stage].label}",
            occurred_at=utcnow(),
            from_stage=from_stage,
            to_stage=to_stage,
        )
    )


def pending_follow_ups(conn: Connection) -> list[dict]:
    """Follow-ups not yet done, oldest date first (R36)."""
    query = (
        _select()
        .where(activities.c.follow_up_date.is_not(None), activities.c.done.is_(False))
        .order_by(activities.c.follow_up_date, activities.c.id)
    )
    return [dict(row) for row in conn.execute(query).mappings()]


def stage_history(conn: Connection) -> list[tuple[int, str, str]]:
    """Every stage change as (deal id, from stage, to stage)."""
    query = select(activities.c.deal_id, activities.c.from_stage, activities.c.to_stage).where(
        activities.c.type == "stage_change"
    )
    return [tuple(row) for row in conn.execute(query)]
