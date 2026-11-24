"""One transaction per request: a request that fails after writing changes nothing."""

from fastapi.testclient import TestClient
from sqlalchemy import insert

from app.core.db import Conn
from app.core.tables import organizations
from app.main import create_app
from conftest import make_empty_database


def test_a_request_that_fails_after_writing_leaves_the_database_unchanged(test_env):
    make_empty_database(test_env)
    app = create_app()

    @app.post("/api/test-only/fail-after-write")
    def fail_after_write(conn: Conn):
        conn.execute(insert(organizations).values(name="Half saved"))
        raise RuntimeError("failed after writing")

    with TestClient(app, base_url="http://localhost", raise_server_exceptions=False) as client:
        assert client.post("/api/test-only/fail-after-write").status_code == 500
        assert client.get("/api/organizations").json() == []


def test_a_request_that_refuses_after_writing_leaves_the_database_unchanged(test_env):
    make_empty_database(test_env)
    app = create_app()

    @app.post("/api/test-only/refuse-after-write")
    def refuse_after_write(conn: Conn):
        from fastapi import HTTPException

        conn.execute(insert(organizations).values(name="Half saved"))
        raise HTTPException(status_code=409, detail="refused")

    with TestClient(app, base_url="http://localhost") as client:
        assert client.post("/api/test-only/refuse-after-write").status_code == 409
        assert client.get("/api/organizations").json() == []
