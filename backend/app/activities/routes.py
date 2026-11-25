from fastapi import APIRouter, Response

from app.activities import service
from app.activities.schemas import ActivityCreate, ActivityOut, ActivityUpdate
from app.core.auth import CurrentUser
from app.core.db import Conn

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.post("", status_code=201, response_model=ActivityOut)
def create_activity(body: ActivityCreate, conn: Conn, user: CurrentUser):
    return service.create_activity(conn, user, body)


@router.patch("/{activity_id}", response_model=ActivityOut)
def update_activity(activity_id: int, body: ActivityUpdate, conn: Conn, user: CurrentUser):
    return service.update_activity(conn, user, activity_id, body.changes())


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, conn: Conn):
    service.delete_activity(conn, activity_id)
    return Response(status_code=204)
