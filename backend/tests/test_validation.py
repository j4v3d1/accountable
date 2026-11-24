"""R3, R7, R10 and R13: invalid input returns 422, and missing records 404."""

import pytest


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"name": "   "},
        {"name": "Org", "industry": "Banking"},
        {"name": "Org", "website": "not a website"},
    ],
)
def test_invalid_organizations_are_refused(client, body):
    assert client.post("/api/organizations", json=body).status_code == 422


@pytest.mark.parametrize(
    "body",
    [
        {"last_name": "Nair"},
        {"first_name": "Priya"},
        {"first_name": "Priya", "last_name": "Nair", "email": "priya-at-example.com"},
        {"first_name": "Priya", "last_name": "Nair", "status": "vip"},
        {"first_name": "Priya", "last_name": "Nair", "organization_id": 999},
    ],
)
def test_invalid_contacts_are_refused(client, body):
    assert client.post("/api/contacts", json=body).status_code == 422


GOOD_DEAL = {"name": "Deal", "value": 1000, "close_date": "2027-01-01"}


@pytest.mark.parametrize(
    "change",
    [
        {"name": None},
        {"value": None},
        {"close_date": None},
        {"value": -1},
        {"value": 10.5},
        {"probability": 101},
        {"probability": -1},
        {"stage": "won"},
        {"contact_id": 999},
        {"organization_id": 999},
        {"close_date": "soon"},
    ],
)
def test_invalid_deals_are_refused(client, change):
    body = {key: value for key, value in {**GOOD_DEAL, **change}.items() if value is not None}

    assert client.post("/api/deals", json=body).status_code == 422


def test_valid_optional_fields_are_accepted_and_blank_text_becomes_empty(api):
    org = api.org(name="  Harbor Point Lending ", website="https://harborpoint.example/loans", notes="  ")
    contact = api.contact(email="lucy.chen@example.com", phone="", job_title="Loan officer")

    assert org["name"] == "Harbor Point Lending"
    assert org["notes"] is None
    assert contact["phone"] is None
    assert contact["email"] == "lucy.chen@example.com"


@pytest.mark.parametrize(
    "path,body",
    [
        ("organizations", {"name": None}),
        ("organizations", {"website": "nope"}),
        ("contacts", {"first_name": None}),
        ("contacts", {"email": "nope"}),
        ("deals", {"value": None}),
        ("deals", {"probability": None}),
        ("deals", {"stage": None}),
        ("deals", {"probability": 150}),
    ],
)
def test_invalid_updates_are_refused(api, client, path, body):
    record = {"organizations": api.org, "contacts": api.contact, "deals": api.deal}[path]()

    assert client.patch(f"/api/{path}/{record['id']}", json=body).status_code == 422


def test_invalid_activities_are_refused(api, client):
    contact = api.contact()
    base = {"type": "note", "description": "x", "contact_id": contact["id"]}

    assert client.post("/api/activities", json={**base, "description": " "}).status_code == 422
    assert client.post("/api/activities", json={**base, "type": "meeting"}).status_code == 422
    assert client.post("/api/activities", json={**base, "follow_up_date": "tomorrow"}).status_code == 422


@pytest.mark.parametrize("path", ["organizations", "contacts", "deals"])
def test_missing_records_return_404(client, path):
    assert client.get(f"/api/{path}/999").status_code == 404
    assert client.patch(f"/api/{path}/999", json={}).status_code == 404


def test_a_missing_activity_returns_404(client):
    assert client.patch("/api/activities/999", json={"description": "x"}).status_code == 404
