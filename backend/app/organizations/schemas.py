from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator

from app.contacts.schemas import ContactOut
from app.core.fields import OptionalText, PatchModel, RequiredText, Website, blank_to_none
from app.deals.schemas import DealOut

Industry = Literal["Brokerage", "Mortgage lending", "Development", "Property management", "Relocation", "Other"]
OptionalIndustry = Annotated[Industry | None, BeforeValidator(blank_to_none)]


class OrganizationCreate(BaseModel):
    name: RequiredText
    website: Website = None
    industry: OptionalIndustry = None
    notes: OptionalText = None


class OrganizationUpdate(PatchModel):
    NOT_NULL = ("name",)

    name: RequiredText | None = None
    website: Website = None
    industry: OptionalIndustry = None
    notes: OptionalText = None


class OrganizationOut(BaseModel):
    id: int
    name: str
    website: str | None
    industry: Industry | None
    notes: str | None
    contact_count: int
    open_deal_count: int
    created_at: datetime
    updated_at: datetime
    created_by_name: str
    updated_by_name: str


class OrganizationDetail(OrganizationOut):
    contacts: list[ContactOut]
    deals: list[DealOut]


class OrganizationImpact(BaseModel):
    contacts: int
    deals: int
