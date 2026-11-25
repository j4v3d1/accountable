"""Signed out, every API route answers 401 but the public ones (R51). The routes are
found by walking the app, so a new route can't be missed."""

import re

import pytest

from app.main import create_app

PUBLIC = {("GET", "/api/config"), ("GET", "/api/health"), ("POST", "/api/auth/local")}


def api_routes() -> list[tuple[str, str]]:
    """Every route in the app's OpenAPI schema, which lists every route its routers add."""
    found = []
    for path, operations in create_app().openapi()["paths"].items():
        concrete = re.sub(r"\{[^}]+\}", "1", path)
        found.extend((method.upper(), concrete) for method in operations)
    return sorted(found)


ROUTES = api_routes()
SIGNED_IN_ROUTES = [route for route in ROUTES if route not in PUBLIC]


def test_the_walk_finds_the_routes():
    assert ("GET", "/api/organizations") in SIGNED_IN_ROUTES
    assert ("POST", "/api/deals/1/move") in SIGNED_IN_ROUTES
    assert ("GET", "/api/me") in SIGNED_IN_ROUTES
    assert PUBLIC <= set(ROUTES)


@pytest.mark.parametrize(
    "authorization",
    [None, "Bearer not-a-token", "Bearer ", "Basic bWF5YTpsb2NhbA==", "maya.torres@example.com"],
    ids=["no token", "bad token", "empty token", "another scheme", "no scheme"],
)
@pytest.mark.parametrize(("method", "path"), SIGNED_IN_ROUTES, ids=lambda value: str(value))
def test_every_route_answers_401_signed_out(signed_out_client, method, path, authorization):
    headers = {"Authorization": authorization} if authorization else {}

    response = signed_out_client.request(method, path, headers=headers)

    assert response.status_code == 401, response.text
    assert response.headers["www-authenticate"] == "Bearer"


def test_the_public_routes_answer_signed_out(signed_out_client):
    assert signed_out_client.get("/api/config").status_code == 200
    assert signed_out_client.get("/api/health").status_code == 200
    response = signed_out_client.post("/api/auth/local", json={"email": "maya.torres@example.com", "password": "local"})
    assert response.status_code == 200
