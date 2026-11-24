"""R4: what happens to linked records, and the counts the delete dialog shows."""

from sqlalchemy import func, select

from app.core.tables import activities


def test_deleting_an_organization_keeps_and_unlinks_its_contacts_and_deals(api, client):
    org = api.org()
    contact = api.contact(organization_id=org["id"])
    deal = api.deal(organization_id=org["id"], contact_id=contact["id"])

    assert api.get(f"/api/organizations/{org['id']}/delete-impact") == {"contacts": 1, "deals": 1}
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204

    assert client.get(f"/api/organizations/{org['id']}").status_code == 404
    assert api.get(f"/api/contacts/{contact['id']}")["organization_id"] is None
    assert api.get(f"/api/deals/{deal['id']}")["organization_id"] is None
    assert api.get(f"/api/deals/{deal['id']}")["contact_id"] == contact["id"]


def test_deleting_a_contact_unlinks_their_deals_and_deletes_only_their_own_activities(api, client):
    contact = api.contact()
    deal = api.deal(contact_id=contact["id"])
    api.activity(contact_id=contact["id"])
    api.activity(contact_id=contact["id"], type="call")
    deal_note = api.activity(deal_id=deal["id"])

    assert api.get(f"/api/contacts/{contact['id']}/delete-impact") == {"deals": 1, "activities": 2}
    assert client.delete(f"/api/contacts/{contact['id']}").status_code == 204

    kept = api.get(f"/api/deals/{deal['id']}")
    assert kept["contact_id"] is None
    assert [entry["id"] for entry in kept["timeline"]] == [deal_note["id"]]


def test_deleting_a_deal_deletes_its_activities_including_stage_changes(api, client):
    contact = api.contact()
    deal = api.deal(stage="showing", contact_id=contact["id"])
    api.move(deal["id"], "offer", 0)
    api.activity(deal_id=deal["id"])
    contact_note = api.activity(contact_id=contact["id"])

    assert api.get(f"/api/deals/{deal['id']}/delete-impact") == {"activities": 2}
    assert client.delete(f"/api/deals/{deal['id']}").status_code == 204

    assert client.get(f"/api/deals/{deal['id']}").status_code == 404
    timeline = api.get(f"/api/contacts/{contact['id']}")["timeline"]
    assert [entry["id"] for entry in timeline] == [contact_note["id"]]
    with client.app.state.engine.connect() as conn:
        left = conn.scalar(select(func.count()).where(activities.c.deal_id == deal["id"]))
    assert left == 0


def test_delete_impact_counts_zero_when_nothing_is_linked(api):
    org = api.org()
    contact = api.contact()
    deal = api.deal()

    assert api.get(f"/api/organizations/{org['id']}/delete-impact") == {"contacts": 0, "deals": 0}
    assert api.get(f"/api/contacts/{contact['id']}/delete-impact") == {"deals": 0, "activities": 0}
    assert api.get(f"/api/deals/{deal['id']}/delete-impact") == {"activities": 0}


def test_deleting_a_missing_record_returns_404(client):
    for path in ["organizations", "contacts", "deals", "activities"]:
        assert client.delete(f"/api/{path}/999").status_code == 404, path
    for path in ["organizations", "contacts", "deals"]:
        assert client.get(f"/api/{path}/999/delete-impact").status_code == 404, path
