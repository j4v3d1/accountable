"""With a built frontend (npm start and Render), FastAPI serves it from the same address,
and any address outside /api/ that isn't a file gets index.html."""

import pytest
from fastapi.testclient import TestClient

from app.core import config
from app.main import create_app
from conftest import make_empty_database


@pytest.fixture
def built(tmp_path, monkeypatch, test_env):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Accountable</title>")
    (dist / "assets" / "app.js").write_text("console.log('app')")
    (tmp_path / "secret.txt").write_text("not for the browser")
    monkeypatch.setattr(config, "FRONTEND_DIST_DIR", dist)
    make_empty_database(test_env)
    with TestClient(create_app(seed_if_empty=False), base_url="http://localhost") as client:
        yield client


def test_the_built_files_are_served_signed_out(built):
    response = built.get("/assets/app.js")

    assert response.status_code == 200
    assert response.text == "console.log('app')"


@pytest.mark.parametrize("path", ["/", "/deals/12", "/pipeline", "/no/such/page"])
def test_any_other_address_gets_the_page_so_a_refresh_still_opens(built, path):
    response = built.get(path)

    assert response.status_code == 200
    assert "<title>Accountable</title>" in response.text


def test_files_outside_the_build_are_never_served(built):
    response = built.get("/..%2Fsecret.txt")

    assert "not for the browser" not in response.text


@pytest.mark.parametrize("path", ["/api/nothing-here", "/api"])
def test_an_unknown_api_address_is_a_404_not_the_page(built, path):
    assert built.get(path).status_code == 404


def test_the_api_still_needs_sign_in(built):
    assert built.get("/api/organizations").status_code == 401


def test_without_a_build_only_the_api_is_served(tmp_path, monkeypatch, test_env):
    monkeypatch.setattr(config, "FRONTEND_DIST_DIR", tmp_path / "not-built")
    make_empty_database(test_env)

    with TestClient(create_app(seed_if_empty=False), base_url="http://localhost") as client:
        assert client.get("/deals/12").status_code == 404
