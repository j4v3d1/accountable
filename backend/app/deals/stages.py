"""The only list of pipeline stages, in board order."""

from dataclasses import dataclass
from typing import Literal

StageKey = Literal["new_lead", "qualified", "showing", "offer", "under_contract", "closed_won", "lost"]


@dataclass(frozen=True)
class Stage:
    key: StageKey
    label: str
    probability: int
    open: bool


STAGES: list[Stage] = [
    Stage("new_lead", "New Lead", 10, True),
    Stage("qualified", "Qualified", 20, True),
    Stage("showing", "Showing", 40, True),
    Stage("offer", "Offer", 60, True),
    Stage("under_contract", "Under Contract", 90, True),
    Stage("closed_won", "Closed (Won)", 100, False),
    Stage("lost", "Lost", 0, False),
]

BY_KEY: dict[str, Stage] = {stage.key: stage for stage in STAGES}
STAGE_KEYS: list[str] = [stage.key for stage in STAGES]
OPEN_STAGE_KEYS: list[str] = [stage.key for stage in STAGES if stage.open]
CLOSED_STAGES = ("closed_won", "lost")
