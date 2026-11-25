"""The API only answers requests addressed to this computer, or on Render its own
hostname, so a web page can't reach it through DNS rebinding (concern 22)."""

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.main import create_app
from conftest import make_empty_database


@pytest.mark.parametrize("host", ["localhost:5173", "localhost:8000", "127.0.0.1:8000", "localhost"])
def test_requests_addressed_to_this_computer_are_answered(client, host):
    response = client.get("/api/stages", headers={"host": host})

    assert response.status_code == 200


@pytest.mark.parametrize("host", ["attacker.example", "attacker.example:8000", "192.168.1.20:8000"])
def test_requests_addressed_to_any_other_host_are_refused(client, host):
    response = client.get("/api/stages", headers={"host": host})

    assert response.status_code == 400


def test_the_render_hostname_is_allowed_only_when_render_sets_it(monkeypatch):
    assert config.allowed_hosts() == ["localhost", "127.0.0.1"]

    monkeypatch.setenv("RENDER_EXTERNAL_HOSTNAME", "accountable.onrender.example")

    assert config.allowed_hosts() == ["localhost", "127.0.0.1", "accountable.onrender.example"]


def test_on_render_its_own_hostname_is_answered_and_others_are_not(monkeypatch, test_env):
    monkeypatch.setenv("RENDER_EXTERNAL_HOSTNAME", "accountable.onrender.example")
    make_empty_database(test_env)

    with TestClient(create_app(seed_if_empty=False), base_url="http://localhost") as client:
        assert client.get("/api/health", headers={"host": "accountable.onrender.example"}).status_code == 200
        assert client.get("/api/health", headers={"host": "other.onrender.example"}).status_code == 400
