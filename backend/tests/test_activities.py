"""R28 to R30, concerns 5 and 6: activities, timelines and stage-change entries."""

from datetime import datetime, timezone


def test_an_activity_belongs_to_a_contact_or_a_deal(api):
    contact = api.contact()
    deal = api.deal()

    on_contact = api.activity(contact_id=contact["id"])
    on_deal = api.activity(deal_id=deal["id"], type="email")

    assert (on_contact["contact_id"], on_contact["deal_id"]) == (contact["id"], None)
    assert (on_deal["deal_id"], on_deal["contact_id"]) == (deal["id"], None)


def test_an_activity_on_both_or_neither_is_refused(api, client):
    contact = api.contact()
    deal = api.deal()
    base = {"type": "note", "description": "x"}

    assert client.post("/api/activities", json={**base, "contact_id": contact["id"], "deal_id": deal["id"]}).status_code == 422
    assert client.post("/api/activities", json=base).status_code == 422


def test_an_activity_on_a_missing_contact_or_deal_is_refused(client):
    assert client.post("/api/activities", json={"type": "note", "description": "x", "contact_id": 999}).status_code == 422
    assert client.post("/api/activities", json={"type": "note", "description": "x", "deal_id": 999}).status_code == 422


def test_stage_changes_cannot_be_created_by_hand(api, client):
    deal = api.deal()

    response = client.post("/api/activities", json={"type": "stage_change", "description": "x", "deal_id": deal["id"]})

    assert response.status_code == 422


def test_note_call_and_email_entries_can_be_edited_and_deleted(api, client):
    contact = api.contact()
    for kind in ["note", "call", "email"]:
        activity = api.activity(contact_id=contact["id"], type=kind, follow_up_date="2026-11-20")

        edited = api.patch(f"/api/activities/{activity['id']}", {"description": "Edited", "done": True, "type": "call"})
        assert (edited["description"], edited["done"], edited["type"]) == ("Edited", True, "call")

        assert client.delete(f"/api/activities/{activity['id']}").status_code == 204
    assert api.get(f"/api/contacts/{contact['id']}")["timeline"] == []


def test_editing_or_deleting_a_stage_change_entry_returns_409(api, client):
    deal = api.deal(stage="showing")
    api.move(deal["id"], "offer", 0)
    [entry] = api.stage_changes(deal["id"])

    assert client.patch(f"/api/activities/{entry['id']}", json={"description": "x"}).status_code == 409
    assert client.delete(f"/api/activities/{entry['id']}").status_code == 409
    assert len(api.stage_changes(deal["id"])) == 1


def test_a_timeline_is_newest_first(api):
    deal = api.deal()
    older = api.activity(deal_id=deal["id"], occurred_at="2026-11-10T09:00:00Z")
    newer = api.activity(deal_id=deal["id"], occurred_at="2026-11-12T09:00:00Z")
    oldest = api.activity(deal_id=deal["id"], occurred_at="2026-11-01T09:00:00Z")

    timeline = api.get(f"/api/deals/{deal['id']}")["timeline"]

    assert [entry["id"] for entry in timeline] == [newer["id"], older["id"], oldest["id"]]


def test_a_contacts_timeline_includes_their_deals_activities_newest_first(api):
    contact = api.contact()
    their_deal = api.deal(name="142 Maple Ave purchase", contact_id=contact["id"], stage="showing")
    other_deal = api.deal(name="Someone else's deal")
    own = api.activity(contact_id=contact["id"], occurred_at="2026-11-10T09:00:00Z")
    on_deal = api.activity(deal_id=their_deal["id"], occurred_at="2026-11-12T09:00:00Z")
    api.activity(deal_id=other_deal["id"], occurred_at="2026-11-13T09:00:00Z")
    api.move(their_deal["id"], "offer", 0)

    timeline = api.get(f"/api/contacts/{contact['id']}")["timeline"]

    assert [entry["type"] for entry in timeline] == ["stage_change", "note", "note"]
    assert [entry["id"] for entry in timeline[1:]] == [on_deal["id"], own["id"]]
    assert timeline[0]["deal_name"] == "142 Maple Ave purchase"
    assert timeline[1]["deal_name"] == "142 Maple Ave purchase"
    assert timeline[2]["deal_name"] is None


def test_occurred_at_is_stored_in_utc_and_comes_back_with_its_time_zone(api):
    contact = api.contact()

    activity = api.activity(contact_id=contact["id"], occurred_at="2026-11-18T09:30:00-05:00")

    returned = datetime.fromisoformat(activity["occurred_at"])
    assert returned.utcoffset() is not None
    assert returned == datetime(2026, 11, 18, 14, 30, tzinfo=timezone.utc)
    assert api.get(f"/api/contacts/{contact['id']}")["timeline"][0]["occurred_at"] == activity["occurred_at"]


def test_occurred_at_defaults_to_now(api):
    contact = api.contact()
    before = datetime.now(timezone.utc)

    activity = api.activity(contact_id=contact["id"])

    returned = datetime.fromisoformat(activity["occurred_at"])
    assert before.replace(microsecond=0) <= returned <= datetime.now(timezone.utc)


def test_done_defaults_to_false_and_follow_up_date_is_optional(api):
    contact = api.contact()

    activity = api.activity(contact_id=contact["id"])

    assert activity["done"] is False
    assert activity["follow_up_date"] is None


def test_an_activity_shows_the_name_of_its_contact_or_deal(api):
    contact = api.contact(first_name="Lucy", last_name="Chen")
    deal = api.deal(name="Maple Ridge ranch sale")

    assert api.activity(contact_id=contact["id"])["contact_name"] == "Lucy Chen"
    assert api.activity(deal_id=deal["id"])["deal_name"] == "Maple Ridge ranch sale"
