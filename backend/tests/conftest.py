"""Shared fixtures: a fresh temporary database, a fixed today(), local sign-in and an
API client signed in as Maya Torres for every test, plus small helpers for creating
records and a fake Supabase key set."""

import os
import shutil
import tempfile
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
from sqlalchemy.engine import make_url

# Set before any app module is imported, so nothing under test can reach the
# default database or Supabase, even at import time (concern 23).
_SESSION_DIR = Path(tempfile.mkdtemp(prefix="accountable-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_SESSION_DIR / 'import.db'}"
os.environ["ACCOUNTABLE_TODAY"] = "2026-11-18"
os.environ["ACCOUNTABLE_AUTH"] = "local"
for _name in ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "RENDER_EXTERNAL_HOSTNAME"):
    os.environ.pop(_name, None)

TODAY = "2026-11-18"  # a Wednesday
MAYA = "maya.torres@example.com"
SAM = "sam.okafor@example.com"
JORDAN = "jordan@example.com"
SLOWEST_UNIT_TEST = 1.0  # seconds (R66)

_TEMPLATE = _SESSION_DIR / "template.db"
_setup_time = pytest.StashKey[float]()


@pytest.hookimpl(wrapper=True)
def pytest_runtest_makereport(item, call):
    """Fail any test whose setup and run take a second or more (R66)."""
    report = yield
    if report.when == "setup":
        item.stash[_setup_time] = report.duration
    elif report.when == "call" and report.passed:
        took = item.stash.get(_setup_time, 0.0) + report.duration
        if took >= SLOWEST_UNIT_TEST:
            report.outcome = "failed"
            report.longrepr = f"Took {took:.2f}s. Every unit test must take under a second (R66)."
    return report


@pytest.fixture(autouse=True)
def test_env(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("ACCOUNTABLE_TODAY", TODAY)
    monkeypatch.setenv("ACCOUNTABLE_AUTH", "local")
    return url


def make_empty_database(url: str) -> None:
    """A migrated database with no records, copied from one made once per session.
    The app sees an existing (empty) database and doesn't seed it."""
    from app.core.db import make_engine, run_migrations

    if not _TEMPLATE.exists():
        engine = make_engine(f"sqlite:///{_TEMPLATE}")
        run_migrations(engine)
        engine.dispose()
    database = make_url(url).database
    assert database is not None
    shutil.copyfile(_TEMPLATE, database)


def sign_in(client, email: str = MAYA) -> dict[str, str]:
    """The header that signs a request in as one of the made-up teammates (R54)."""
    response = client.post("/api/auth/local", json={"email": email, "password": "local"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['token']}"}


@pytest.fixture
def signed_out_client(test_env):
    from fastapi.testclient import TestClient

    from app.main import create_app

    make_empty_database(test_env)
    with TestClient(create_app(seed_if_empty=False), base_url="http://localhost") as c:
        yield c


@pytest.fixture
def client(signed_out_client):
    """Signed in as Maya Torres."""
    signed_out_client.headers.update(sign_in(signed_out_client))
    return signed_out_client


@pytest.fixture
def as_sam(client) -> dict[str, str]:
    """Headers for a second teammate, Sam Okafor, on the same app."""
    return sign_in(client, SAM)


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


@dataclass
class FakeSupabase:
    """A Supabase project's signing keys, made in the test, with no network (concern 17)."""

    url: str = "https://project.supabase.example"
    keys: dict = field(default_factory=dict)
    published_kids: list[str] = field(default_factory=list)
    fetches: int = 0

    @property
    def issuer(self) -> str:
        return f"{self.url}/auth/v1"

    def published(self, *kids: str) -> dict:
        found = []
        for kid in kids:
            private_key, algorithm = self.keys[kid]
            make_jwk = ECAlgorithm if algorithm == "ES256" else RSAAlgorithm
            jwk = make_jwk.to_jwk(private_key.public_key(), as_dict=True)
            found.append({**jwk, "kid": kid, "alg": algorithm, "use": "sig"})
        return {"keys": found}

    def fetcher(self, *kids: str):
        """Serves the keys named, counting fetches. Add to `published_kids` to rotate."""
        self.published_kids = list(kids)

        def fetch(url: str) -> dict:
            assert url == f"{self.issuer}/.well-known/jwks.json"
            self.fetches += 1
            return self.published(*self.published_kids)

        return fetch

    def token(self, kid: str = "es-key", signed_with: str | None = None, **claims) -> str:
        private_key, algorithm = self.keys[signed_with or kid]
        body = {
            "sub": "7f1c0d2e-0000-4000-8000-000000000001",
            "email": "ana.ruiz@example.com",
            "user_metadata": {"display_name": "Ana Ruiz"},
            "aud": "authenticated",
            "iss": self.issuer,
            "exp": datetime.now(UTC) + timedelta(hours=1),
            **claims,
        }
        return jwt.encode(body, private_key, algorithm=algorithm, headers={"kid": kid})


@pytest.fixture(scope="session")
def _supabase_keys() -> dict:
    """Made once per session: making keys, RSA especially, is slow."""
    return {
        "es-key": (ec.generate_private_key(ec.SECP256R1()), "ES256"),
        "rs-key": (rsa.generate_private_key(public_exponent=65537, key_size=2048), "RS256"),
        "other-key": (ec.generate_private_key(ec.SECP256R1()), "ES256"),
        "new-key": (ec.generate_private_key(ec.SECP256R1()), "ES256"),
    }


@pytest.fixture
def supabase(_supabase_keys) -> FakeSupabase:
    return FakeSupabase(keys=_supabase_keys)
