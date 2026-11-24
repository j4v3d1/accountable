from fastapi import APIRouter, Response

from app.core.db import Conn
from app.organizations import service
from app.organizations.schemas import (
    OrganizationCreate,
    OrganizationDetail,
    OrganizationImpact,
    OrganizationOut,
    OrganizationUpdate,
)

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationOut])
def list_organizations(conn: Conn):
    return service.list_organizations(conn)


@router.post("", status_code=201, response_model=OrganizationDetail)
def create_organization(body: OrganizationCreate, conn: Conn):
    return service.create_organization(conn, body)


@router.get("/{organization_id}", response_model=OrganizationDetail)
def get_organization(organization_id: int, conn: Conn):
    return service.get_organization(conn, organization_id)


@router.patch("/{organization_id}", response_model=OrganizationDetail)
def update_organization(organization_id: int, body: OrganizationUpdate, conn: Conn):
    return service.update_organization(conn, organization_id, body.changes())


@router.delete("/{organization_id}", status_code=204)
def delete_organization(organization_id: int, conn: Conn):
    service.delete_organization(conn, organization_id)
    return Response(status_code=204)


@router.get("/{organization_id}/delete-impact", response_model=OrganizationImpact)
def organization_delete_impact(organization_id: int, conn: Conn):
    return service.delete_impact(conn, organization_id)
