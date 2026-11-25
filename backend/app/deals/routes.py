from fastapi import APIRouter, Response

from app.core.auth import CurrentUser
from app.core.db import Conn
from app.deals import service, stages
from app.deals.schemas import DealCreate, DealDetail, DealImpact, DealOut, DealUpdate, MoveIn, StageOut

router = APIRouter(prefix="/api", tags=["deals"])


@router.get("/stages", response_model=list[StageOut])
def list_stages():
    return stages.STAGES


@router.get("/deals", response_model=list[DealOut])
def list_deals(conn: Conn):
    return service.list_deals(conn)


@router.post("/deals", status_code=201, response_model=DealDetail)
def create_deal(body: DealCreate, conn: Conn, user: CurrentUser):
    return service.create_deal(conn, user, body)


@router.get("/deals/{deal_id}", response_model=DealDetail)
def get_deal(deal_id: int, conn: Conn):
    return service.get_deal(conn, deal_id)


@router.patch("/deals/{deal_id}", response_model=DealDetail)
def update_deal(deal_id: int, body: DealUpdate, conn: Conn, user: CurrentUser):
    return service.update_deal(conn, user, deal_id, body.changes())


@router.delete("/deals/{deal_id}", status_code=204)
def delete_deal(deal_id: int, conn: Conn):
    service.delete_deal(conn, deal_id)
    return Response(status_code=204)


@router.get("/deals/{deal_id}/delete-impact", response_model=DealImpact)
def deal_delete_impact(deal_id: int, conn: Conn):
    return service.delete_impact(conn, deal_id)


@router.post("/deals/{deal_id}/move", response_model=list[DealOut])
def move_deal(deal_id: int, body: MoveIn, conn: Conn, user: CurrentUser):
    return service.move_deal(conn, user, deal_id, body.stage, body.index)
