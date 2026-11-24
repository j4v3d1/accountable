"""R8, R11 and R17: the columns each list returns."""

from datetime import datetime


def test_organizations_come_with_their_contact_and_open_deal_counts(api):
    org = api.org(name="Harbor Point Lending", industry="Mortgage lending", website="harborpoint.example")
    api.org(name="Empty Org")
    api.contact(organization_id=org["id"])
    api.contact(organization_id=org["id"], first_name="Omar")
    api.deal(organization_id=org["id"], stage="offer")
    api.deal(organization_id=org["id"], stage="closed_won")
    api.deal(organization_id=org["id"], stage="lost")

    rows = {row["name"]: row for row in api.get("/api/organizations")}

    harbor = rows["Harbor Point Lending"]
    assert (harbor["contact_count"], harbor["open_deal_count"]) == (2, 1)
    assert (harbor["industry"], harbor["website"]) == ("Mortgage lending", "harborpoint.example")
    assert (rows["Empty Org"]["contact_count"], rows["Empty Org"]["open_deal_count"]) == (0, 0)


def test_contacts_come_with_their_organization_name_and_last_activity_date(api):
    org = api.org(name="Harbor Point Lending")
    with_org = api.contact(first_name="Lucy", last_name="Chen", organization_id=org["id"], status="qualified")
    quiet = api.contact(first_name="Ben", last_name="Foster")
    deal = api.deal(contact_id=with_org["id"])
    api.activity(contact_id=with_org["id"], occurred_at="2026-11-10T09:00:00Z")
    api.activity(deal_id=deal["id"], occurred_at="2026-11-12T15:00:00Z")

    rows = {row["id"]: row for row in api.get("/api/contacts")}

    lucy = rows[with_org["id"]]
    assert lucy["name"] == "Lucy Chen"
    assert lucy["organization_name"] == "Harbor Point Lending"
    assert lucy["status"] == "qualified"
    assert datetime.fromisoformat(lucy["last_activity_at"]) == datetime.fromisoformat("2026-11-12T15:00:00+00:00")
    assert rows[quiet["id"]]["organization_name"] is None
    assert rows[quiet["id"]]["last_activity_at"] is None


def test_deals_come_with_contact_and_organization_names_expected_value_and_late_flag(api):
    org = api.org(name="Keystone Brokerage")
    contact = api.contact(first_name="Omar", last_name="Haddad")
    api.deal(
        name="55 Juniper St purchase",
        contact_id=contact["id"],
        organization_id=org["id"],
        stage="offer",
        value=529000,
        close_date="2026-11-10",
    )
    api.deal(name="Bare deal", value=100001, probability=15)

    rows = {row["name"]: row for row in api.get("/api/deals")}

    juniper = rows["55 Juniper St purchase"]
    assert juniper["contact_name"] == "Omar Haddad"
    assert juniper["organization_name"] == "Keystone Brokerage"
    assert juniper["probability"] == 60
    assert juniper["expected_value"] == 317400
    assert juniper["late"] is True
    bare = rows["Bare deal"]
    assert (bare["contact_name"], bare["organization_name"]) == (None, None)
    assert bare["expected_value"] == 15000.15


def test_records_link_to_each_other_on_their_pages(api):
    org = api.org(name="Harbor Point Lending")
    contact = api.contact(organization_id=org["id"])
    deal = api.deal(organization_id=org["id"], contact_id=contact["id"])

    org_page = api.get(f"/api/organizations/{org['id']}")
    contact_page = api.get(f"/api/contacts/{contact['id']}")
    deal_page = api.get(f"/api/deals/{deal['id']}")

    assert [c["id"] for c in org_page["contacts"]] == [contact["id"]]
    assert [d["id"] for d in org_page["deals"]] == [deal["id"]]
    assert contact_page["organization"] == {"id": org["id"], "name": "Harbor Point Lending"}
    assert [d["id"] for d in contact_page["deals"]] == [deal["id"]]
    assert deal_page["contact"] == {"id": contact["id"], "name": "Priya Nair"}
    assert deal_page["organization"] == {"id": org["id"], "name": "Harbor Point Lending"}
