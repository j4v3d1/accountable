from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.activities.schemas import ActivityOut
from app.core.fields import Email, Link, OptionalText, PatchModel, RequiredText
from app.deals.schemas import DealOut

ContactStatus = Literal["lead", "qualified", "customer"]


class ContactCreate(BaseModel):
    first_name: RequiredText
    last_name: RequiredText
    email: Email = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: int | None = None
    status: ContactStatus = "lead"


class ContactUpdate(PatchModel):
    NOT_NULL = ("first_name", "last_name", "status")

    first_name: RequiredText | None = None
    last_name: RequiredText | None = None
    email: Email = None
    phone: OptionalText = None
    job_title: OptionalText = None
    organization_id: int | None = None
    status: ContactStatus | None = None


class ContactOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    name: str
    email: str | None
    phone: str | None
    job_title: str | None
    organization_id: int | None
    organization_name: str | None
    status: ContactStatus
    last_activity_at: datetime | None
    created_at: datetime
    updated_at: datetime
    created_by_name: str
    updated_by_name: str


class ContactDetail(ContactOut):
    organization: Link | None
    deals: list[DealOut]
    timeline: list[ActivityOut]


class ContactImpact(BaseModel):
    deals: int
    activities: int
