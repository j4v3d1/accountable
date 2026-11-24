from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.activities.schemas import ActivityOut
from app.core.fields import Link, OptionalText, PatchModel, RequiredText
from app.deals.stages import StageKey

Value = Annotated[int, Field(ge=0)]
Probability = Annotated[int, Field(ge=0, le=100)]


class StageOut(BaseModel):
    key: str
    label: str
    probability: int
    open: bool


class DealCreate(BaseModel):
    name: RequiredText
    contact_id: int | None = None
    organization_id: int | None = None
    stage: StageKey = "new_lead"
    value: Value
    probability: Probability | None = None
    close_date: date
    notes: OptionalText = None


class DealUpdate(PatchModel):
    NOT_NULL = ("name", "stage", "value", "probability", "close_date")

    name: RequiredText | None = None
    contact_id: int | None = None
    organization_id: int | None = None
    stage: StageKey | None = None
    value: Value | None = None
    probability: Probability | None = None
    close_date: date | None = None
    notes: OptionalText = None


class MoveIn(BaseModel):
    stage: StageKey
    index: Annotated[int, Field(ge=0)]


class DealOut(BaseModel):
    id: int
    name: str
    contact_id: int | None
    contact_name: str | None
    organization_id: int | None
    organization_name: str | None
    stage: str
    value: int
    probability: int
    expected_value: float
    close_date: date
    position: int
    notes: str | None
    late: bool
    created_at: datetime
    updated_at: datetime


class DealDetail(DealOut):
    contact: Link | None
    organization: Link | None
    timeline: list[ActivityOut]


class DealImpact(BaseModel):
    activities: int
