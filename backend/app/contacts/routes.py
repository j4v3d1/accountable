from fastapi import APIRouter, Response

from app.contacts import service
from app.contacts.schemas import ContactCreate, ContactDetail, ContactImpact, ContactOut, ContactUpdate
from app.core.auth import CurrentUser
from app.core.db import Conn

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
def list_contacts(conn: Conn):
    return service.list_contacts(conn)


@router.post("", status_code=201, response_model=ContactDetail)
def create_contact(body: ContactCreate, conn: Conn, user: CurrentUser):
    return service.create_contact(conn, user, body)


@router.get("/{contact_id}", response_model=ContactDetail)
def get_contact(contact_id: int, conn: Conn):
    return service.get_contact(conn, contact_id)


@router.patch("/{contact_id}", response_model=ContactDetail)
def update_contact(contact_id: int, body: ContactUpdate, conn: Conn, user: CurrentUser):
    return service.update_contact(conn, user, contact_id, body.changes())


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, conn: Conn):
    service.delete_contact(conn, contact_id)
    return Response(status_code=204)


@router.get("/{contact_id}/delete-impact", response_model=ContactImpact)
def contact_delete_impact(contact_id: int, conn: Conn):
    return service.delete_impact(conn, contact_id)
