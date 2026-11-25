"""The account endpoints, and the people kept from their tokens (R51, R54, R55)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.core.auth import LocalTokens, initials
from app.core.tables import users
from app.main import create_app
from conftest import JORDAN, SAM, make_empty_database, sign_in


def stored_users(client) -> dict[str, dict]:
    with client.app.state.engine.connect() as conn:
        return {row["id"]: dict(row) for row in conn.execute(select(users)).mappings()}


def test_config_in_local_mode_says_local(signed_out_client):
    assert signed_out_client.get("/api/config").json() == {"auth": "local"}


@pytest.fixture
def supabase_mode(monkeypatch, test_env):
    monkeypatch.setenv("ACCOUNTABLE_AUTH", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://ref.supabase.example")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    make_empty_database(test_env)
    with TestClient(create_app(seed_if_empty=False), base_url="http://localhost") as client:
        yield client


def test_config_in_supabase_mode_gives_the_project_and_its_public_key(supabase_mode):
    assert supabase_mode.get("/api/config").json() == {
        "auth": "supabase",
        "supabaseUrl": "https://ref.supabase.example",
        "publishableKey": "sb_publishable_test",
    }


def test_local_sign_in_does_not_exist_in_supabase_mode(supabase_mode):
    response = supabase_mode.post("/api/auth/local", json={"email": "maya.torres@example.com", "password": "local"})

    assert response.status_code == 404


def test_health_answers_signed_out(signed_out_client):
    assert signed_out_client.get("/api/health").json() == {"ok": True}


def test_a_wrong_local_password_is_a_401_with_the_message(signed_out_client):
    response = signed_out_client.post("/api/auth/local", json={"email": "maya.torres@example.com", "password": "x"})

    assert response.status_code == 401
    assert response.json()["detail"] == "That email and password don't match."


def test_me_gives_the_signed_in_person(client):
    assert client.get("/api/me").json() == {
        "id": "local-maya-torres",
        "name": "Maya Torres",
        "email": "maya.torres@example.com",
        "initials": "MT",
    }


def test_me_for_someone_with_no_display_name_uses_their_email(client):
    response = client.get("/api/me", headers=sign_in(client, JORDAN))

    assert response.json()["name"] == "jordan@example.com"
    assert response.json()["initials"] == "JO"


def test_the_person_is_added_to_users_on_their_first_request(client, as_sam):
    client.get("/api/me", headers=as_sam)

    stored = stored_users(client)
    assert stored["local-sam-okafor"]["name"] == "Sam Okafor"
    assert stored["local-sam-okafor"]["email"] == SAM


def test_the_stored_name_follows_the_token_when_it_changes(client):
    client.get("/api/me")
    with client.app.state.engine.begin() as conn:
        conn.execute(update(users).where(users.c.id == "local-maya-torres").values(name="Maya T"))

    client.get("/api/me")

    assert stored_users(client)["local-maya-torres"]["name"] == "Maya Torres"


def test_a_request_with_an_unchanged_name_does_not_write_the_users_row(client):
    client.get("/api/me")
    before = stored_users(client)["local-maya-torres"]["updated_at"]

    client.get("/api/organizations")

    assert stored_users(client)["local-maya-torres"]["updated_at"] == before


def test_a_token_from_an_earlier_start_is_refused_by_a_new_start(client):
    earlier = LocalTokens().sign_in("maya.torres@example.com", "local")

    assert client.get("/api/me", headers={"Authorization": f"Bearer {earlier}"}).status_code == 401


@pytest.mark.parametrize(
    ("name", "email", "expected"),
    [
        ("Maya Torres", "maya.torres@example.com", "MT"),
        ("Mary Ann van der Berg", None, "MB"),
        ("Cher", None, "C"),
        ("  priya   shah ", None, "PS"),
        ("jordan@example.com", "jordan@example.com", "JO"),
        ("j@example.com", "j@example.com", "J"),
        ("", None, ""),
    ],
)
def test_initials_come_from_the_name_or_the_email(name, email, expected):
    assert initials(name, email) == expected
