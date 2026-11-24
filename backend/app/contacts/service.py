"""Contacts, with their organization, deals and timeline."""

from sqlalchemy import Connection, delete, exists, func, select, update

from app.activities import service as activities_service
from app.contacts.schemas import ContactCreate
from app.core.db import insert_row
from app.core.errors import Invalid, NotFound
from app.core.tables import activities, contacts, deals, organizations
from app.deals import service as deals_service


def _select():
    own = select(func.max(activities.c.occurred_at)).where(activities.c.contact_id == contacts.c.id)
    via_deals = (
        select(func.max(activities.c.occurred_at))
        .select_from(activities.join(deals, activities.c.deal_id == deals.c.id))
        .where(deals.c.contact_id == contacts.c.id)
    )
    return select(
        contacts,
        organizations.c.name.label("organization_name"),
        own.scalar_subquery().label("own_activity_at"),
        via_deals.scalar_subquery().label("deal_activity_at"),
    ).select_from(contacts.outerjoin(organizations, contacts.c.organization_id == organizations.c.id))


def _out(row) -> dict:
    contact = dict(row)
    contact["name"] = f"{contact['first_name']} {contact['last_name']}"
    # The last activity is the newest entry in their timeline, which includes their deals (concern 5).
    times = [t for t in (contact.pop("own_activity_at"), contact.pop("deal_activity_at")) if t is not None]
    contact["last_activity_at"] = max(times) if times else None
    return contact


def list_contacts(conn: Connection, *, organization_id: int | None = None) -> list[dict]:
    query = _select().order_by(contacts.c.last_name, contacts.c.first_name, contacts.c.id)
    if organization_id is not None:
        query = query.where(contacts.c.organization_id == organization_id)
    return [_out(row) for row in conn.execute(query).mappings()]


def get_contact(conn: Connection, contact_id: int) -> dict:
    row = conn.execute(_select().where(contacts.c.id == contact_id)).mappings().first()
    if row is None:
        raise NotFound("Contact not found")
    contact = _out(row)
    contact["organization"] = (
        {"id": contact["organization_id"], "name": contact["organization_name"]} if contact["organization_id"] else None
    )
    contact["deals"] = deals_service.list_deals(conn, contact_id=contact_id)
    contact["timeline"] = activities_service.timeline_for_contact(conn, contact_id)
    return contact


def _exists(conn: Connection, contact_id: int) -> None:
    if not conn.scalar(select(exists().where(contacts.c.id == contact_id))):
        raise NotFound("Contact not found")


def _check_links(conn: Connection, values: dict) -> None:
    organization_id = values.get("organization_id")
    if organization_id is not None and not conn.scalar(select(exists().where(organizations.c.id == organization_id))):
        raise Invalid("organization_id", "That organization doesn't exist", organization_id)


def create_contact(conn: Connection, data: ContactCreate) -> dict:
    values = data.model_dump()
    _check_links(conn, values)
    contact_id = insert_row(conn, contacts, **values)
    return get_contact(conn, contact_id)


def update_contact(conn: Connection, contact_id: int, changes: dict) -> dict:
    _exists(conn, contact_id)
    _check_links(conn, changes)
    if changes:
        conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**changes))
    return get_contact(conn, contact_id)


def delete_impact(conn: Connection, contact_id: int) -> dict:
    _exists(conn, contact_id)
    return {
        "deals": conn.scalar(select(func.count()).where(deals.c.contact_id == contact_id)),
        "activities": conn.scalar(select(func.count()).where(activities.c.contact_id == contact_id)),
    }


def delete_contact(conn: Connection, contact_id: int) -> None:
    _exists(conn, contact_id)
    # The foreign keys unlink their deals and delete their own activities.
    conn.execute(delete(contacts).where(contacts.c.id == contact_id))
