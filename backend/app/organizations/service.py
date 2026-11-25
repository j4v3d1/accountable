"""Organizations, with their contacts and deals."""

from sqlalchemy import Connection, delete, exists, func, select, update

from app.contacts import service as contacts_service
from app.core import added_by
from app.core.auth import User
from app.core.db import insert_row
from app.core.errors import NotFound
from app.core.tables import contacts, deals, organizations
from app.deals import service as deals_service
from app.deals.stages import OPEN_STAGE_KEYS
from app.organizations.schemas import OrganizationCreate


def _select():
    contact_count = select(func.count()).where(contacts.c.organization_id == organizations.c.id)
    open_deal_count = select(func.count()).where(
        deals.c.organization_id == organizations.c.id, deals.c.stage.in_(OPEN_STAGE_KEYS)
    )
    return select(
        organizations,
        contact_count.scalar_subquery().label("contact_count"),
        open_deal_count.scalar_subquery().label("open_deal_count"),
        *added_by.names(),
    ).select_from(added_by.join_names(organizations, organizations))


def list_organizations(conn: Connection) -> list[dict]:
    query = _select().order_by(organizations.c.name, organizations.c.id)
    return [dict(row) for row in conn.execute(query).mappings()]


def get_organization(conn: Connection, organization_id: int) -> dict:
    row = conn.execute(_select().where(organizations.c.id == organization_id)).mappings().first()
    if row is None:
        raise NotFound("Organization not found")
    organization = dict(row)
    organization["contacts"] = contacts_service.list_contacts(conn, organization_id=organization_id)
    organization["deals"] = deals_service.list_deals(conn, organization_id=organization_id)
    return organization


def _exists(conn: Connection, organization_id: int) -> None:
    if not conn.scalar(select(exists().where(organizations.c.id == organization_id))):
        raise NotFound("Organization not found")


def create_organization(conn: Connection, user: User, data: OrganizationCreate) -> dict:
    organization_id = insert_row(conn, organizations, **data.model_dump(), **added_by.added_by(user))
    return get_organization(conn, organization_id)


def update_organization(conn: Connection, user: User, organization_id: int, changes: dict) -> dict:
    _exists(conn, organization_id)
    if changes:
        values = {**changes, **added_by.changed_by(user)}
        conn.execute(update(organizations).where(organizations.c.id == organization_id).values(**values))
    return get_organization(conn, organization_id)


def delete_impact(conn: Connection, organization_id: int) -> dict:
    _exists(conn, organization_id)
    return {
        "contacts": conn.scalar(select(func.count()).where(contacts.c.organization_id == organization_id)),
        "deals": conn.scalar(select(func.count()).where(deals.c.organization_id == organization_id)),
    }


def delete_organization(conn: Connection, organization_id: int) -> None:
    _exists(conn, organization_id)
    # The foreign keys keep its contacts and deals, and clear their link to it.
    conn.execute(delete(organizations).where(organizations.c.id == organization_id))
