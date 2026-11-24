"""R31 to R38: every dashboard figure, against small hand-built data with today fixed.

Today is Wednesday 2026-11-18 unless a test says otherwise, so this week runs to
Sunday 2026-11-22, and the six months are June to November 2026.
"""

import pytest

from conftest import TODAY


def won(api, value, close_date, **fields):
    deal = api.deal(value=value, stage="closed_won", close_date=close_date, **fields)
    return deal


def lost(api, value, close_date, **fields):
    return api.deal(value=value, stage="lost", close_date=close_date, **fields)


def dashboard(api):
    return api.get("/api/dashboard")


@pytest.fixture
def sales(api):
    """Won and lost deals across the six months, one outside them, and three open deals."""
    won(api, 300000, "2026-11-05")
    won(api, 200000, "2026-11-10")
    won(api, 400000, "2026-10-15")
    won(api, 100000, "2026-08-20")
    won(api, 999000, "2026-05-10")  # seven months back: outside the window
    lost(api, 150000, "2026-11-02")
    lost(api, 250000, "2026-09-09")
    api.deal(name="Offer deal", value=500000, stage="offer", close_date="2026-12-01")
    api.deal(name="Late deal", value=200000, stage="showing", probability=45, close_date="2026-11-01")
    api.deal(name="New deal", value=100000, stage="new_lead", close_date="2027-01-01")
    return api


def test_it_reports_today_so_the_header_and_figures_agree(api):
    assert dashboard(api)["today"] == TODAY


def test_revenue_won_this_month_and_the_change_from_last_month(sales):
    revenue = dashboard(sales)["revenue"]

    assert revenue["this_month"] == 500000
    assert revenue["last_month"] == 400000
    assert revenue["last_month_label"] == "October"
    assert revenue["change_percent"] == pytest.approx(25.0)


def test_the_six_month_total_best_month_and_monthly_figures(sales):
    revenue = dashboard(sales)["revenue"]

    assert revenue["six_month_total"] == 1000000
    assert revenue["best_month"] == {"month": "2026-11", "label": "Nov", "value": 500000}
    assert [(m["label"], m["won_value"], m["won_count"], m["lost_count"]) for m in revenue["months"]] == [
        ("Jun", 0, 0, 0),
        ("Jul", 0, 0, 0),
        ("Aug", 100000, 1, 0),
        ("Sep", 0, 0, 1),
        ("Oct", 400000, 1, 0),
        ("Nov", 500000, 2, 1),
    ]


def test_open_value_expected_revenue_and_its_share(sales):
    pipeline = dashboard(sales)["open_pipeline"]

    assert pipeline["count"] == 3
    assert pipeline["value"] == 800000
    assert pipeline["expected"] == 300000 + 90000 + 10000
    assert pipeline["expected_share"] == pytest.approx(50.0)
    stages = {s["key"]: (s["value"], s["count"]) for s in pipeline["stages"]}
    assert stages == {
        "new_lead": (100000, 1),
        "qualified": (0, 0),
        "showing": (200000, 1),
        "offer": (500000, 1),
        "under_contract": (0, 0),
    }
    assert [s["label"] for s in pipeline["stages"]][0] == "New Lead"


def test_deals_won_this_month_last_month_and_the_win_rate(sales):
    won_figures = dashboard(sales)["deals_won"]

    assert won_figures["this_month"] == 2
    assert won_figures["last_month"] == 1
    assert won_figures["won_6m"] == 4
    assert won_figures["lost_6m"] == 2
    assert won_figures["win_rate"] == pytest.approx(100 * 4 / 6)


def test_the_summary_line_counts(sales):
    contact = sales.contact()
    sales.activity(contact_id=contact["id"], follow_up_date="2026-11-10")
    sales.activity(contact_id=contact["id"], follow_up_date="2026-11-17")
    sales.activity(contact_id=contact["id"], follow_up_date="2026-11-12", done=True)

    summary = dashboard(sales)["summary"]

    assert summary == {"open_deals": 3, "open_value": 800000, "overdue_follow_ups": 2, "late_deals": 1}


def test_the_funnel_counts_each_deal_up_to_its_furthest_stage(api):
    api.deal(name="Still new", value=100)
    reached_showing = api.deal(name="Reached showing", value=200)
    api.move(reached_showing["id"], "showing", 0)
    lost_at_offer = api.deal(name="Lost at offer", value=300)
    api.move(lost_at_offer["id"], "offer", 0)
    api.move(lost_at_offer["id"], "lost", 0)
    won_deal = api.deal(name="Won", value=400)
    api.move(won_deal["id"], "closed_won", 0)
    api.deal(name="Started qualified", value=500, stage="qualified")

    funnel = dashboard(api)["funnel"]

    assert [(s["key"], s["count"], s["value"]) for s in funnel] == [
        ("new_lead", 5, 1500),
        ("qualified", 4, 1400),
        ("showing", 3, 900),
        ("offer", 2, 700),
        ("under_contract", 1, 400),
        ("closed_won", 1, 400),
    ]
    shares = [s["share_from_previous"] for s in funnel]
    assert shares[0] is None
    assert shares[1:] == [pytest.approx(80.0), pytest.approx(75.0), pytest.approx(200 / 3), pytest.approx(50.0), pytest.approx(100.0)]


def test_a_funnel_share_is_blank_when_the_stage_before_had_no_deals(api):
    api.deal(name="Only new", value=100)

    shares = [s["share_from_previous"] for s in dashboard(api)["funnel"]]

    assert shares == [None, pytest.approx(0.0), None, None, None, None]


def follow_up_descriptions(groups):
    return {name: [a["description"] for a in items] for name, items in groups.items()}


def test_follow_ups_are_grouped_and_in_date_order_with_done_ones_left_out(api):
    contact = api.contact()
    deal = api.deal(name="142 Maple Ave purchase")
    for description, date in [
        ("later Dec 1", "2026-12-01"),
        ("this week Sunday", "2026-11-22"),
        ("overdue Nov 17", "2026-11-17"),
        ("later Monday", "2026-11-23"),
        ("this week today", TODAY),
        ("overdue Nov 10", "2026-11-10"),
    ]:
        api.activity(contact_id=contact["id"], description=description, follow_up_date=date)
    api.activity(deal_id=deal["id"], description="done one", follow_up_date="2026-11-12", done=True)
    api.activity(deal_id=deal["id"], description="no follow-up")

    groups = dashboard(api)["follow_ups"]

    assert follow_up_descriptions(groups) == {
        "overdue": ["overdue Nov 10", "overdue Nov 17"],
        "this_week": ["this week today", "this week Sunday"],
        "later": ["later Monday", "later Dec 1"],
    }
    assert groups["overdue"][0]["contact_name"] == "Priya Nair"


def test_on_a_sunday_this_week_is_just_today(api, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2026-11-22")
    contact = api.contact()
    for description, date in [("Saturday", "2026-11-21"), ("Sunday", "2026-11-22"), ("Monday", "2026-11-23")]:
        api.activity(contact_id=contact["id"], description=description, follow_up_date=date)

    assert follow_up_descriptions(dashboard(api)["follow_ups"]) == {
        "overdue": ["Saturday"],
        "this_week": ["Sunday"],
        "later": ["Monday"],
    }


def test_recent_activity_is_the_latest_ten_of_every_kind(api):
    contact = api.contact()
    for day in range(1, 12):
        api.activity(contact_id=contact["id"], description=f"day {day}", occurred_at=f"2026-11-{day:02d}T09:00:00Z")
    deal = api.deal(stage="showing")
    api.move(deal["id"], "offer", 0)

    recent = dashboard(api)["recent_activity"]

    assert len(recent) == 10
    assert recent[0]["type"] == "stage_change"
    assert recent[0]["deal_name"] == deal["name"]
    assert [a["description"] for a in recent[1:]] == [f"day {day}" for day in range(11, 2, -1)]


def test_months_are_right_across_a_year_end(api, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2027-01-05")
    won(api, 700000, "2026-12-20")
    won(api, 50000, "2027-01-02")
    won(api, 80000, "2026-07-31")  # six months back from January is August, so this is outside

    revenue = dashboard(api)["revenue"]

    assert [m["month"] for m in revenue["months"]] == ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]
    assert (revenue["this_month"], revenue["last_month"], revenue["last_month_label"]) == (50000, 700000, "December")
    assert revenue["six_month_total"] == 750000
    assert revenue["best_month"]["label"] == "Dec"


def test_at_a_month_end_the_month_is_still_the_current_one(api, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", "2026-11-30")
    won(api, 100000, "2026-11-30")
    won(api, 200000, "2026-12-01")  # tomorrow's month doesn't count yet

    revenue = dashboard(api)["revenue"]

    assert revenue["this_month"] == 100000
    assert revenue["months"][-1]["label"] == "Nov"


def test_figures_change_after_a_deal_is_won_or_a_follow_up_is_added(sales):
    before = dashboard(sales)
    offer = next(d for d in sales.get("/api/deals") if d["name"] == "Offer deal")

    sales.move(offer["id"], "closed_won", 0)
    sales.activity(deal_id=offer["id"], description="Send the closing gift", follow_up_date="2026-11-20")
    after = dashboard(sales)

    assert after["revenue"]["this_month"] == before["revenue"]["this_month"] + 500000
    assert after["deals_won"]["this_month"] == before["deals_won"]["this_month"] + 1
    assert after["open_pipeline"]["count"] == before["open_pipeline"]["count"] - 1
    assert [a["description"] for a in after["follow_ups"]["this_week"]] == ["Send the closing gift"]
    assert after["recent_activity"][0]["description"] in {"Send the closing gift", "Moved from Offer to Closed (Won)"}


def test_an_empty_database_gives_zeros_and_blanks_without_errors(api):
    board = dashboard(api)

    assert board["summary"] == {"open_deals": 0, "open_value": 0, "overdue_follow_ups": 0, "late_deals": 0}
    revenue = board["revenue"]
    assert (revenue["this_month"], revenue["last_month"], revenue["six_month_total"]) == (0, 0, 0)
    assert revenue["change_percent"] is None
    assert revenue["last_month_label"] == "October"
    assert revenue["best_month"] is None
    assert len(revenue["months"]) == 6
    assert board["open_pipeline"]["expected_share"] == 0
    assert board["deals_won"]["win_rate"] is None
    assert all(s["count"] == 0 and s["share_from_previous"] is None for s in board["funnel"])
    assert board["follow_ups"] == {"overdue": [], "this_week": [], "later": []}
    assert board["recent_activity"] == []
