"""Deals, and the deal rules: probability (R14), close date on win or loss (R15),
the late flag (R16), stage-change entries (R19) and positions in a column (R23, R25)."""

from sqlalchemy import Connection, case, delete, exists, func, insert, select, update

from app.activities import service as activities_service
from app.core.config import today
from app.core.errors import Invalid, NotFound
from app.core.tables import activities, contacts, deals, organizations
from app.deals.schemas import DealCreate
from app.deals.stages import BY_KEY, CLOSED_STAGES, STAGE_KEYS

BOARD_ORDER = (case({key: index for index, key in enumerate(STAGE_KEYS)}, value=deals.c.stage), deals.c.position)


def _select():
    contact_name = (contacts.c.first_name + " " + contacts.c.last_name).label("contact_name")
    return select(deals, contact_name, organizations.c.name.label("organization_name")).select_from(
        deals.outerjoin(contacts, deals.c.contact_id == contacts.c.id).outerjoin(
            organizations, deals.c.organization_id == organizations.c.id
        )
    )


def is_late(stage: str, close_date) -> bool:
    return stage not in CLOSED_STAGES and close_date < today()


def _out(row) -> dict:
    deal = dict(row)
    deal["expected_value"] = deal["value"] * deal["probability"] / 100
    deal["late"] = is_late(deal["stage"], deal["close_date"])
    return deal


def list_deals(conn: Connection, *, contact_id: int | None = None, organization_id: int | None = None) -> list[dict]:
    query = _select().order_by(*BOARD_ORDER)
    if contact_id is not None:
        query = query.where(deals.c.contact_id == contact_id)
    if organization_id is not None:
        query = query.where(deals.c.organization_id == organization_id)
    return [_out(row) for row in conn.execute(query).mappings()]


def get_deal(conn: Connection, deal_id: int) -> dict:
    row = conn.execute(_select().where(deals.c.id == deal_id)).mappings().first()
    if row is None:
        raise NotFound("Deal not found")
    deal = _out(row)
    deal["contact"] = {"id": deal["contact_id"], "name": deal["contact_name"]} if deal["contact_id"] else None
    deal["organization"] = (
        {"id": deal["organization_id"], "name": deal["organization_name"]} if deal["organization_id"] else None
    )
    deal["timeline"] = activities_service.timeline_for_deal(conn, deal_id)
    return deal


def _current(conn: Connection, deal_id: int):
    row = conn.execute(select(deals).where(deals.c.id == deal_id)).mappings().first()
    if row is None:
        raise NotFound("Deal not found")
    return row


def _check_links(conn: Connection, values: dict) -> None:
    if values.get("contact_id") is not None:
        if not conn.scalar(select(exists().where(contacts.c.id == values["contact_id"]))):
            raise Invalid("contact_id", "That contact doesn't exist", values["contact_id"])
    if values.get("organization_id") is not None:
        if not conn.scalar(select(exists().where(organizations.c.id == values["organization_id"]))):
            raise Invalid("organization_id", "That organization doesn't exist", values["organization_id"])


def _column(conn: Connection, stage: str, leave_out: int | None = None) -> list[int]:
    """The ids of the deals in a stage's column, top first."""
    query = select(deals.c.id).where(deals.c.stage == stage).order_by(deals.c.position, deals.c.id)
    return [deal_id for deal_id in conn.scalars(query) if deal_id != leave_out]


def _renumber(conn: Connection, ids: list[int]) -> None:
    """Positions 0, 1, 2... in the order given, so a column has no gaps or duplicates."""
    for position, deal_id in enumerate(ids):
        conn.execute(update(deals).where(deals.c.id == deal_id).values(position=position))


def _push_down(conn: Connection, stage: str) -> None:
    conn.execute(update(deals).where(deals.c.stage == stage).values(position=deals.c.position + 1))


def create_deal(conn: Connection, data: DealCreate) -> dict:
    values = data.model_dump()
    _check_links(conn, values)
    if values["probability"] is None:
        values["probability"] = BY_KEY[values["stage"]].probability
    # A new deal goes to the top of its column (R25).
    _push_down(conn, values["stage"])
    deal_id = conn.execute(insert(deals).values(**values, position=0)).inserted_primary_key[0]
    return get_deal(conn, deal_id)


def _stage_change_values(current, new_stage: str, changes: dict) -> dict:
    """What a change of stage does to the rest of the deal (R14, R15)."""
    values = {"stage": new_stage}
    if changes.get("probability") is None:
        values["probability"] = BY_KEY[new_stage].probability
    # The close date becomes today, unless the same request changes it on purpose.
    if new_stage in CLOSED_STAGES and changes.get("close_date", current["close_date"]) == current["close_date"]:
        values["close_date"] = today()
    return values


def update_deal(conn: Connection, deal_id: int, changes: dict) -> dict:
    current = _current(conn, deal_id)
    _check_links(conn, changes)
    new_stage = changes.get("stage", current["stage"])
    if new_stage != current["stage"]:
        changes = {**changes, **_stage_change_values(current, new_stage, changes)}
        _renumber(conn, _column(conn, current["stage"], leave_out=deal_id))
        _push_down(conn, new_stage)
        changes["position"] = 0
        activities_service.log_stage_change(conn, deal_id, current["stage"], new_stage)
    if changes:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**changes))
    return get_deal(conn, deal_id)


def move_deal(conn: Connection, deal_id: int, stage: str, index: int) -> list[dict]:
    """Put the deal at `index` in `stage`'s column, renumbering both columns. Returns the whole board."""
    current = _current(conn, deal_id)
    if stage != current["stage"]:
        _renumber(conn, _column(conn, current["stage"], leave_out=deal_id))
        values = _stage_change_values(current, stage, {})
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))
        activities_service.log_stage_change(conn, deal_id, current["stage"], stage)
    column = _column(conn, stage, leave_out=deal_id)
    column.insert(min(index, len(column)), deal_id)
    _renumber(conn, column)
    return list_deals(conn)


def delete_impact(conn: Connection, deal_id: int) -> dict:
    _current(conn, deal_id)
    return {"activities": conn.scalar(select(func.count()).where(activities.c.deal_id == deal_id))}


def delete_deal(conn: Connection, deal_id: int) -> None:
    current = _current(conn, deal_id)
    # Its activities go with it, through the foreign key's ON DELETE CASCADE.
    conn.execute(delete(deals).where(deals.c.id == deal_id))
    _renumber(conn, _column(conn, current["stage"]))
