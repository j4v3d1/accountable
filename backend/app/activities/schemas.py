from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, model_validator

from app.core.fields import PatchModel, RequiredText

ActivityType = Literal["note", "call", "email"]


class ActivityCreate(BaseModel):
    type: ActivityType
    contact_id: int | None = None
    deal_id: int | None = None
    description: RequiredText
    occurred_at: datetime | None = None
    follow_up_date: date | None = None
    done: bool = False

    @model_validator(mode="after")
    def _belongs_to_one_record(self):
        if (self.contact_id is None) == (self.deal_id is None):
            raise ValueError("An activity belongs to one contact or one deal")
        return self


class ActivityUpdate(PatchModel):
    NOT_NULL = ("type", "description", "occurred_at", "done")

    type: ActivityType | None = None
    description: RequiredText | None = None
    occurred_at: datetime | None = None
    follow_up_date: date | None = None
    done: bool | None = None


class ActivityOut(BaseModel):
    id: int
    type: Literal["note", "call", "email", "stage_change"]
    contact_id: int | None
    contact_name: str | None
    deal_id: int | None
    deal_name: str | None
    description: str
    occurred_at: datetime
    follow_up_date: date | None
    done: bool
    from_stage: str | None
    to_stage: str | None
    created_at: datetime
    updated_at: datetime
