"""Every dashboard figure (R31 to R38), worked out from the current data and today().

The data is small, so the deals are read once and the figures are added up here.
"""

import calendar
from datetime import date, timedelta

from sqlalchemy import Connection, select

from app.activities import service as activities_service
from app.core.config import today as get_today
from app.core.tables import deals
from app.deals.service import is_late
from app.deals.stages import BY_KEY, OPEN_STAGE_KEYS, STAGE_KEYS

FUNNEL_STAGES = STAGE_KEYS[: STAGE_KEYS.index("closed_won") + 1]
RECENT_ACTIVITY = 10


def _month(day: date, months_back: int = 0) -> tuple[int, int]:
    index = day.year * 12 + day.month - 1 - months_back
    return index // 12, index % 12 + 1


def _in_month(deal: dict, month: tuple[int, int]) -> bool:
    return (deal["close_date"].year, deal["close_date"].month) == month


def _percent(part: float, whole: float) -> float | None:
    return 100 * part / whole if whole else None


def _revenue(all_deals: list[dict], today: date) -> tuple[dict, dict]:
    months = [_month(today, back) for back in range(5, -1, -1)]
    won = [d for d in all_deals if d["stage"] == "closed_won"]
    lost = [d for d in all_deals if d["stage"] == "lost"]
    rows = []
    for year, month in months:
        won_here = [d for d in won if _in_month(d, (year, month))]
        rows.append(
            {
                "month": f"{year}-{month:02d}",
                "label": calendar.month_abbr[month],
                "won_value": sum(d["value"] for d in won_here),
                "won_count": len(won_here),
                "lost_count": sum(1 for d in lost if _in_month(d, (year, month))),
            }
        )
    this_month, last_month = rows[-1], rows[-2]
    best = max(rows, key=lambda row: (row["won_value"], row["month"]))
    revenue = {
        "this_month": this_month["won_value"],
        "last_month": last_month["won_value"],
        "last_month_label": calendar.month_name[_month(today, 1)[1]],
        # Blank when last month had no revenue; the page says so in words (R32).
        "change_percent": _percent(this_month["won_value"] - last_month["won_value"], last_month["won_value"]),
        "six_month_total": sum(row["won_value"] for row in rows),
        "best_month": {"month": best["month"], "label": best["label"], "value": best["won_value"]}
        if best["won_value"] > 0
        else None,
        "months": rows,
    }
    won_6m = sum(row["won_count"] for row in rows)
    lost_6m = sum(row["lost_count"] for row in rows)
    deals_won = {
        "this_month": this_month["won_count"],
        "last_month": last_month["won_count"],
        "won_6m": won_6m,
        "lost_6m": lost_6m,
        # Won divided by won plus lost, over the six months by close date (R33).
        "win_rate": _percent(won_6m, won_6m + lost_6m),
    }
    return revenue, deals_won


def _open_pipeline(open_deals: list[dict]) -> dict:
    value = sum(d["value"] for d in open_deals)
    expected = sum(d["value"] * d["probability"] / 100 for d in open_deals)
    return {
        "count": len(open_deals),
        "value": value,
        "expected": expected,
        "expected_share": _percent(expected, value) or 0,
        "stages": [
            {
                "key": key,
                "label": BY_KEY[key].label,
                "value": sum(d["value"] for d in open_deals if d["stage"] == key),
                "count": sum(1 for d in open_deals if d["stage"] == key),
            }
            for key in OPEN_STAGE_KEYS
        ],
    }


def _funnel(all_deals: list[dict], history: list[tuple[int, str, str]]) -> list[dict]:
    """Each deal counts in every stage up to its furthest one, from its stage-change history (concern 8)."""
    reached: dict[int, set[str]] = {d["id"]: {d["stage"]} for d in all_deals}
    for deal_id, from_stage, to_stage in history:
        reached.setdefault(deal_id, set()).update((from_stage, to_stage))
    furthest = {}
    for deal_id, stages in reached.items():
        indexes = [FUNNEL_STAGES.index(s) for s in stages if s in FUNNEL_STAGES]
        furthest[deal_id] = max(indexes, default=0)
    rows = []
    for index, key in enumerate(FUNNEL_STAGES):
        here = [d for d in all_deals if furthest[d["id"]] >= index]
        rows.append({"key": key, "label": BY_KEY[key].label, "count": len(here), "value": sum(d["value"] for d in here)})
    for index, row in enumerate(rows):
        # The share that moved on from the stage before; blank when that stage had none (R34).
        row["share_from_previous"] = _percent(row["count"], rows[index - 1]["count"]) if index > 0 else None
    return rows


def _follow_ups(pending: list[dict], today: date) -> dict:
    sunday = today + timedelta(days=6 - today.weekday())
    return {
        "overdue": [a for a in pending if a["follow_up_date"] < today],
        "this_week": [a for a in pending if today <= a["follow_up_date"] <= sunday],
        "later": [a for a in pending if a["follow_up_date"] > sunday],
    }


def get_dashboard(conn: Connection) -> dict:
    today = get_today()
    all_deals = [dict(row) for row in conn.execute(select(deals)).mappings()]
    open_deals = [d for d in all_deals if d["stage"] in OPEN_STAGE_KEYS]
    revenue, deals_won = _revenue(all_deals, today)
    follow_ups = _follow_ups(activities_service.pending_follow_ups(conn), today)
    return {
        "today": today.isoformat(),
        "summary": {
            "open_deals": len(open_deals),
            "open_value": sum(d["value"] for d in open_deals),
            "overdue_follow_ups": len(follow_ups["overdue"]),
            "late_deals": sum(1 for d in open_deals if is_late(d["stage"], d["close_date"])),
        },
        "revenue": revenue,
        "open_pipeline": _open_pipeline(open_deals),
        "deals_won": deals_won,
        "funnel": _funnel(all_deals, activities_service.stage_history(conn)),
        "follow_ups": follow_ups,
        "recent_activity": activities_service.latest(conn, RECENT_ACTIVITY),
    }
