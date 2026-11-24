"""R5 and success criterion 2: data is still there after a restart."""

from fastapi.testclient import TestClient

from app.main import create_app
from conftest import make_empty_database


def test_data_written_through_the_api_survives_a_new_app_instance(test_env):
    make_empty_database(test_env)
    with TestClient(create_app()) as first:
        org = first.post("/api/organizations", json={"name": "Harbor Point Lending"}).json()
        deal = first.post("/api/deals", json={"name": "Deal", "value": 1, "close_date": "2027-01-01"}).json()
        first.post(f"/api/deals/{deal['id']}/move", json={"stage": "offer", "index": 0})

    with TestClient(create_app()) as second:
        assert second.get(f"/api/organizations/{org['id']}").json()["name"] == "Harbor Point Lending"
        restarted = second.get(f"/api/deals/{deal['id']}").json()
        assert restarted["stage"] == "offer"
        assert len(restarted["timeline"]) == 1
