"""The API only answers requests addressed to this computer, so a web page can't
reach it through DNS rebinding (a site whose name is pointed at 127.0.0.1)."""

import pytest


@pytest.mark.parametrize("host", ["localhost:5173", "localhost:8000", "127.0.0.1:8000", "localhost"])
def test_requests_addressed_to_this_computer_are_answered(client, host):
    response = client.get("/api/stages", headers={"host": host})

    assert response.status_code == 200


@pytest.mark.parametrize("host", ["attacker.example", "attacker.example:8000", "192.168.1.20:8000"])
def test_requests_addressed_to_any_other_host_are_refused(client, host):
    response = client.get("/api/stages", headers={"host": host})

    assert response.status_code == 400
