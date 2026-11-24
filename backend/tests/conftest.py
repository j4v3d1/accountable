"""Shared fixtures: a fresh temporary database, a fixed today() and an API client
for every test, plus small helpers for creating records."""

import os
import tempfile
from pathlib import Path

import pytest

# Set before any app module is imported, so nothing under test can reach the
# default database, even at import time.
_SESSION_DIR = Path(tempfile.mkdtemp(prefix="accountable-tests-"))
os.environ["ACCOUNTABLE_DATABASE_URL"] = f"sqlite:///{_SESSION_DIR / 'import.db'}"
os.environ["ACCOUNTABLE_TODAY"] = "2026-11-18"

TODAY = "2026-11-18"  # a Wednesday


@pytest.fixture(autouse=True)
def test_env(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setenv("ACCOUNTABLE_DATABASE_URL", url)
    monkeypatch.setenv("ACCOUNTABLE_TODAY", TODAY)
    return url


def make_empty_database(url: str) -> None:
    """Create the tables, so the app sees an existing (empty) database and doesn't seed it."""
    from app.core.db import create_tables, make_engine

    engine = make_engine(url)
    create_tables(engine)
    engine.dispose()


@pytest.fixture
def client(test_env):
    from fastapi.testclient import TestClient

    from app.main import create_app

    make_empty_database(test_env)
    with TestClient(create_app()) as c:
        yield c


class Api:
    """Creates records through the API and checks each call worked."""

    def __init__(self, client):
        self.client = client

    def _post(self, path, body):
        response = self.client.post(path, json=body)
        assert response.status_code == 201, response.text
        return response.json()

    def org(self, **fields):
        return self._post("/api/organizations", {"name": "Northgate Realty", **fields})

    def contact(self, **fields):
        return self._post("/api/contacts", {"first_name": "Priya", "last_name": "Nair", **fields})

    def deal(self, **fields):
        body = {"name": "88 Birchwood Ct purchase", "value": 415000, "close_date": "2027-01-14", **fields}
        return self._post("/api/deals", body)

    def activity(self, **fields):
        body = {"type": "note", "description": "Talked about the budget", **fields}
        return self._post("/api/activities", body)

    def get(self, path):
        response = self.client.get(path)
        assert response.status_code == 200, response.text
        return response.json()

    def patch(self, path, body):
        response = self.client.patch(path, json=body)
        assert response.status_code == 200, response.text
        return response.json()

    def move(self, deal_id, stage, index):
        response = self.client.post(f"/api/deals/{deal_id}/move", json={"stage": stage, "index": index})
        assert response.status_code == 200, response.text
        return response.json()

    def stage_changes(self, deal_id):
        timeline = self.get(f"/api/deals/{deal_id}")["timeline"]
        return [entry for entry in timeline if entry["type"] == "stage_change"]


@pytest.fixture
def api(client):
    return Api(client)
