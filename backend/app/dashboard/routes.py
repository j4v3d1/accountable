from fastapi import APIRouter

from app.core.db import Conn
from app.dashboard import service
from app.dashboard.schemas import DashboardOut

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(conn: Conn):
    return service.get_dashboard(conn)
