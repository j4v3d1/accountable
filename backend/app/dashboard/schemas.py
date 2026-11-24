from pydantic import BaseModel

from app.activities.schemas import ActivityOut


class Summary(BaseModel):
    open_deals: int
    open_value: int
    overdue_follow_ups: int
    late_deals: int


class Month(BaseModel):
    month: str
    label: str
    won_value: int
    won_count: int
    lost_count: int


class BestMonth(BaseModel):
    month: str
    label: str
    value: int


class Revenue(BaseModel):
    this_month: int
    last_month: int
    last_month_label: str
    change_percent: float | None
    six_month_total: int
    best_month: BestMonth | None
    months: list[Month]


class StageFigure(BaseModel):
    key: str
    label: str
    value: int
    count: int


class OpenPipeline(BaseModel):
    count: int
    value: int
    expected: float
    expected_share: float
    stages: list[StageFigure]


class DealsWon(BaseModel):
    this_month: int
    last_month: int
    won_6m: int
    lost_6m: int
    win_rate: float | None


class FunnelStage(BaseModel):
    key: str
    label: str
    count: int
    value: int
    share_from_previous: float | None


class FollowUps(BaseModel):
    overdue: list[ActivityOut]
    this_week: list[ActivityOut]
    later: list[ActivityOut]


class DashboardOut(BaseModel):
    today: str
    summary: Summary
    revenue: Revenue
    open_pipeline: OpenPipeline
    deals_won: DealsWon
    funnel: list[FunnelStage]
    follow_ups: FollowUps
    recent_activity: list[ActivityOut]
