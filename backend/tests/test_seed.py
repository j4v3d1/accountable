"""R40 to R42: the sample data, the seed on first start and the reset command."""

import os
import re
import subprocess
import sys
from collections import Counter
from datetime import date, datetime, timedelta
from itertools import pairwise
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app import seed
from app.core.db import make_engine
from app.core.tables import activities, contacts, deals, metadata, organizations
from app.deals.stages import STAGE_KEYS
from app.main import create_app
from conftest import make_empty_database

BACKEND_DIR = Path(__file__).resolve().parents[1]
RESERVED = re.compile(r".*@(([a-z0-9-]+\.)*example\.(com|net|org)|[a-z0-9.-]+\.example)$")


def rows(engine, table):
    with engine.connect() as conn:
        return [dict(row) for row in conn.execute(select(table).order_by(table.c.id)).mappings()]


def month_key(day: date, months_back: int) -> tuple[int, int]:
    index = day.year * 12 + day.month - 1 - months_back
    return index // 12, index % 12 + 1


# A normal day, the first and last of a month, New Year's Day and a Sunday.
@pytest.fixture(params=["2026-11-18", "2026-11-01", "2026-03-31", "2027-01-01", "2026-11-22"])
def today(request, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", request.param)
    return date.fromisoformat(request.param)


@pytest.fixture
def seeded(test_env, today):
    engine = make_engine(test_env)
    seed.reset(engine)
    yield engine
    engine.dispose()


def test_a_new_database_is_seeded_on_first_start(test_env):
    with TestClient(create_app(), base_url="http://localhost") as client:
        assert len(client.get("/api/organizations").json()) == 12
        assert len(client.get("/api/deals").json()) == 30


def test_an_existing_database_is_not_reseeded_on_start(test_env):
    make_empty_database(test_env)

    with TestClient(create_app(), base_url="http://localhost") as client:
        assert client.get("/api/organizations").json() == []


def test_the_seed_command_resets_the_data_while_the_app_holds_the_database_open(test_env):
    with TestClient(create_app(), base_url="http://localhost") as client:
        client.post("/api/organizations", json={"name": "Added by hand"})
        client.delete(f"/api/deals/{client.get('/api/deals').json()[0]['id']}")
        with client.app.state.engine.connect() as held_open:
            held_open.execute(select(1))

            result = subprocess.run(
                [sys.executable, "-m", "app.seed"],
                cwd=BACKEND_DIR,
                env=dict(os.environ),
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )

        assert result.returncode == 0, result.stderr
        assert "Sample data loaded" in result.stdout
        names = [org["name"] for org in client.get("/api/organizations").json()]
        assert "Added by hand" not in names
        assert len(names) == 12
        assert len(client.get("/api/deals").json()) == 30


def test_there_is_about_the_right_amount_of_data(seeded):
    assert len(rows(seeded, organizations)) == 12
    assert len(rows(seeded, contacts)) == 40
    assert len(rows(seeded, deals)) == 30
    logged_by_hand = [a for a in rows(seeded, activities) if a["type"] != "stage_change"]
    assert len(logged_by_hand) == 80


def test_every_status_stage_and_industry_appears(seeded):
    assert {c["status"] for c in rows(seeded, contacts)} == {"lead", "qualified", "customer"}
    assert {d["stage"] for d in rows(seeded, deals)} == set(STAGE_KEYS)
    assert {o["industry"] for o in rows(seeded, organizations)} == {
        "Brokerage",
        "Mortgage lending",
        "Development",
        "Property management",
        "Relocation",
        "Other",
    }
    assert {a["type"] for a in rows(seeded, activities)} == {"note", "call", "email", "stage_change"}


def test_deals_are_won_and_lost_in_each_of_the_last_six_months(seeded, today):
    closed = [d for d in rows(seeded, deals) if d["stage"] in ("closed_won", "lost")]
    for months_back in range(6):
        month = month_key(today, months_back)
        in_month = Counter(d["stage"] for d in closed if (d["close_date"].year, d["close_date"].month) == month)
        assert in_month["closed_won"] >= 1, month
        assert in_month["lost"] >= 1, month
    assert all(d["close_date"] <= today for d in closed)


def test_open_deals_close_in_the_months_ahead_and_three_or_four_are_late(seeded, today):
    open_deals = [d for d in rows(seeded, deals) if d["stage"] not in ("closed_won", "lost")]
    late = [d for d in open_deals if d["close_date"] < today]

    assert 3 <= len(late) <= 4
    assert all(today - timedelta(days=30) <= d["close_date"] for d in late)
    ahead = [d for d in open_deals if d["close_date"] >= today]
    assert all(d["close_date"] <= today + timedelta(days=190) for d in ahead)


def test_there_are_follow_ups_overdue_and_due_soon(seeded, today):
    pending = [a for a in rows(seeded, activities) if a["follow_up_date"] and not a["done"]]

    assert len([a for a in pending if a["follow_up_date"] < today]) >= 2
    assert len([a for a in pending if today <= a["follow_up_date"] <= today + timedelta(days=7)]) >= 2
    assert len([a for a in pending if a["follow_up_date"] > today + timedelta(days=7)]) >= 1
    assert any(a["follow_up_date"] and a["done"] for a in rows(seeded, activities))


def test_deals_past_new_lead_have_stage_change_history_that_ends_at_their_stage(seeded):
    changes = [a for a in rows(seeded, activities) if a["type"] == "stage_change"]
    for deal in rows(seeded, deals):
        history = sorted((a for a in changes if a["deal_id"] == deal["id"]), key=lambda a: a["occurred_at"])
        if deal["stage"] == "new_lead":
            assert history == [], deal["name"]
            continue
        assert history, deal["name"]
        assert history[0]["from_stage"] == "new_lead"
        assert all(a["to_stage"] == b["from_stage"] for a, b in pairwise(history))
        assert history[-1]["to_stage"] == deal["stage"]
        assert all(a["description"].startswith("Moved from ") for a in history)


def test_closed_deals_moved_to_their_last_stage_on_their_close_date(seeded):
    changes = {
        a["deal_id"]: a
        for a in sorted(rows(seeded, activities), key=lambda a: a["occurred_at"])
        if a["type"] == "stage_change"
    }
    for deal in rows(seeded, deals):
        if deal["stage"] in ("closed_won", "lost"):
            assert changes[deal["id"]]["occurred_at"].astimezone().date() == deal["close_date"], deal["name"]


def test_activities_belong_to_one_record_and_none_happen_after_today(seeded, today):
    end_of_today = datetime.combine(today + timedelta(days=1), datetime.min.time()).astimezone()
    for activity in rows(seeded, activities):
        assert (activity["contact_id"] is None) != (activity["deal_id"] is None)
        assert activity["occurred_at"] < end_of_today


def test_nothing_seeded_today_is_later_than_the_start_of_the_day(seeded, today):
    # Otherwise, early in the morning, sample entries sit in the future and stay
    # above anything the agent logs, in recent activity and in timelines.
    one_am = datetime.combine(today, datetime.min.time()).astimezone() + timedelta(hours=1)
    for activity in rows(seeded, activities):
        assert activity["occurred_at"] < one_am, activity["description"]


def test_names_are_invented_and_use_reserved_domains(seeded):
    for contact in rows(seeded, contacts):
        if contact["email"]:
            assert RESERVED.match(contact["email"]), contact["email"]
        if contact["phone"]:
            assert "555-01" in contact["phone"], contact["phone"]
    for org in rows(seeded, organizations):
        if org["website"]:
            assert re.search(r"\.example(\.com)?(/|$)", org["website"]), org["website"]


def test_each_column_is_numbered_from_the_top_without_gaps(seeded):
    by_stage = Counter()
    positions = {}
    for deal in rows(seeded, deals):
        positions.setdefault(deal["stage"], []).append(deal["position"])
        by_stage[deal["stage"]] += 1
    for stage, found in positions.items():
        assert sorted(found) == list(range(by_stage[stage])), stage


def test_two_runs_give_the_same_data(tmp_path, today):
    first, second = make_engine(f"sqlite:///{tmp_path / 'a.db'}"), make_engine(f"sqlite:///{tmp_path / 'b.db'}")
    seed.reset(first)
    seed.reset(second)

    for table in metadata.sorted_tables:
        assert rows(first, table) == rows(second, table), table.name


def test_reset_twice_on_the_same_database_starts_from_scratch(seeded):
    seed.reset(seeded)

    with seeded.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(organizations)) == 12
        assert conn.scalar(select(func.min(organizations.c.id))) == 1
