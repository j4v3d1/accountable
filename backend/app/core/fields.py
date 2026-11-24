"""Field types shared by every area's request schemas."""

import re
from typing import Annotated, ClassVar

from pydantic import AfterValidator, BaseModel, BeforeValidator, StringConstraints, model_validator


def blank_to_none(value):
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _check_email(value: str | None) -> str | None:
    if value is not None and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise ValueError("Enter a valid email address")
    return value


def _check_website(value: str | None) -> str | None:
    pattern = r"(https?://)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:\d+)?([/?#]\S*)?"
    if value is not None and not re.fullmatch(pattern, value, flags=re.IGNORECASE):
        raise ValueError("Enter a valid website, such as example.com")
    return value


RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
OptionalText = Annotated[str | None, BeforeValidator(blank_to_none)]
Email = Annotated[str | None, BeforeValidator(blank_to_none), AfterValidator(_check_email)]
Website = Annotated[str | None, BeforeValidator(blank_to_none), AfterValidator(_check_website)]


class PatchModel(BaseModel):
    """A partial update. Fields named in NOT_NULL may be left out, but not set to null."""

    NOT_NULL: ClassVar[tuple[str, ...]] = ()

    @model_validator(mode="after")
    def _required_fields_are_not_null(self):
        for name in self.NOT_NULL:
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} can't be empty")
        return self

    def changes(self) -> dict:
        return self.model_dump(exclude_unset=True)


class Link(BaseModel):
    """A linked record, as shown on another record's page."""

    id: int
    name: str
