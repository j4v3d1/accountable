"""Who added and last changed each record, through every way in (R56, R57)."""

import pytest

from conftest import JORDAN, sign_in


def names(record: dict) -> tuple[str, str]:
    return record["created_by_name"], record["updated_by_name"]


@pytest.mark.parametrize("kind", ["org", "contact", "deal"])
def test_adding_a_record_sets_both_to_whoever_added_it(api, kind):
    record = getattr(api, kind)()

    assert names(record) == ("Maya Torres", "Maya Torres")
    assert record["created_at"] and record["updated_at"]


def test_adding_an_activity_sets_both_to_whoever_added_it(api):
    contact = api.contact()

    activity = api.activity(contact_id=contact["id"])

    assert names(activity) == ("Maya Torres", "Maya Torres")


@pytest.mark.parametrize(
    ("kind", "path", "change"),
    [
        ("org", "/api/organizations/{id}", {"notes": "Quick pre-approvals"}),
        ("contact", "/api/contacts/{id}", {"phone": "(206) 555-0100"}),
        ("deal", "/api/deals/{id}", {"value": 420000}),
    ],
)
def test_an_edit_by_a_teammate_sets_who_last_changed_it(api, client, as_sam, kind, path, change):
    record = getattr(api, kind)()

    response = client.patch(path.format(id=record["id"]), json=change, headers=as_sam)

    assert names(response.json()) == ("Maya Torres", "Sam Okafor")


def test_the_lists_carry_the_names(api, client, as_sam):
    org = api.org()
    client.patch(f"/api/organizations/{org['id']}", json={"notes": "x"}, headers=as_sam)
    api.contact()
    api.deal()

    assert names(api.get("/api/organizations")[0]) == ("Maya Torres", "Sam Okafor")
    assert names(api.get("/api/contacts")[0]) == ("Maya Torres", "Maya Torres")
    assert names(api.get("/api/deals")[0]) == ("Maya Torres", "Maya Torres")


def test_a_move_on_the_board_sets_who_last_changed_the_deal_and_adds_their_stage_change(api, client, as_sam):
    deal = api.deal()

    board = client.post(f"/api/deals/{deal['id']}/move", json={"stage": "showing", "index": 0}, headers=as_sam)

    moved = next(d for d in board.json() if d["id"] == deal["id"])
    assert names(moved) == ("Maya Torres", "Sam Okafor")
    assert [names(entry) for entry in api.stage_changes(deal["id"])] == [("Sam Okafor", "Sam Okafor")]


def test_a_move_within_its_column_still_sets_who_last_changed_it(api, client, as_sam):
    deal = api.deal()
    api.deal(name="Another")

    client.post(f"/api/deals/{deal['id']}/move", json={"stage": "new_lead", "index": 0}, headers=as_sam)

    assert names(api.get(f"/api/deals/{deal['id']}")) == ("Maya Torres", "Sam Okafor")
    assert api.stage_changes(deal["id"]) == []


def test_a_stage_change_by_editing_is_added_by_whoever_changed_the_stage(api, client, as_sam):
    deal = api.deal()

    client.patch(f"/api/deals/{deal['id']}", json={"stage": "offer"}, headers=as_sam)

    assert [entry["created_by_name"] for entry in api.stage_changes(deal["id"])] == ["Sam Okafor"]


def test_marking_a_follow_up_done_sets_who_last_changed_it(api, client, as_sam):
    contact = api.contact()
    follow_up = api.activity(contact_id=contact["id"], follow_up_date="2026-11-20")

    response = client.patch(f"/api/activities/{follow_up['id']}", json={"done": True}, headers=as_sam)

    assert names(response.json()) == ("Maya Torres", "Sam Okafor")


def test_timeline_entries_and_recent_activity_carry_who_added_them(api, client, as_sam):
    contact = api.contact()
    client.post(
        "/api/activities",
        json={"type": "call", "contact_id": contact["id"], "description": "Intro call"},
        headers=as_sam,
    )

    timeline = api.get(f"/api/contacts/{contact['id']}")["timeline"]
    recent = api.get("/api/dashboard")["recent_activity"]

    assert [entry["created_by_name"] for entry in timeline] == ["Sam Okafor"]
    assert [entry["created_by_name"] for entry in recent] == ["Sam Okafor"]


def test_who_added_it_comes_from_the_token_never_the_request(api, client):
    response = client.post(
        "/api/organizations",
        json={"name": "Northgate Realty", "created_by": "local-sam-okafor", "updated_by": "sample-data"},
        headers={"X-User-Id": "local-sam-okafor"},
    )

    assert names(response.json()) == ("Maya Torres", "Maya Torres")


def test_someone_with_no_display_name_is_shown_by_email(api, client):
    response = client.post("/api/organizations", json={"name": "Keystone"}, headers=sign_in(client, JORDAN))

    assert names(response.json()) == ("jordan@example.com", "jordan@example.com")


@pytest.mark.parametrize("kind", ["org", "contact", "deal"])
def test_a_new_record_has_not_been_changed_since_it_was_added(api, kind):
    record = getattr(api, kind)()

    assert record["updated_at"] == record["created_at"]


def test_an_edit_moves_on_when_it_was_last_changed(api):
    org = api.org()

    edited = api.patch(f"/api/organizations/{org['id']}", {"notes": "Changed"})

    assert edited["updated_at"] > edited["created_at"]


def test_deals_that_only_shift_in_their_column_are_not_changed(api, client, as_sam):
    first = api.deal(name="First")
    second = api.deal(name="Second")
    third = api.deal(name="Third")

    client.post(f"/api/deals/{first['id']}/move", json={"stage": "showing", "index": 0}, headers=as_sam)
    api.deal(name="Fourth")

    for untouched in (second, third):
        now = api.get(f"/api/deals/{untouched['id']}")
        assert names(now) == ("Maya Torres", "Maya Torres")
        assert now["updated_at"] == now["created_at"]
