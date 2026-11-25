"""Checking tokens (R51, R54, concern 17), against a key set made in the test, with no network."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.auth import TEAMMATES, LocalTokens, SupabaseTokens, User, fetch_json
from app.core.errors import SignInUnavailable, Unauthorized
from conftest import JORDAN, MAYA


def test_a_good_supabase_token_gives_the_person_it_names(supabase):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))

    user = tokens.check(supabase.token())

    assert user == User(id="7f1c0d2e-0000-4000-8000-000000000001", name="Ana Ruiz", email="ana.ruiz@example.com")


def test_a_token_signed_with_an_rsa_key_is_accepted_too(supabase):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key", "rs-key"))

    assert tokens.check(supabase.token(kid="rs-key")).name == "Ana Ruiz"


def test_someone_with_no_display_name_is_known_by_their_email(supabase):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))

    user = tokens.check(supabase.token(user_metadata={}))

    assert (user.name, user.initials) == ("ana.ruiz@example.com", "AN")


@pytest.mark.parametrize(
    "bad_token",
    [
        pytest.param({"exp": datetime.now(UTC) - timedelta(minutes=1)}, id="expired"),
        pytest.param({"aud": "anon"}, id="another audience"),
        pytest.param({"iss": "https://other.supabase.example/auth/v1"}, id="another issuer"),
        pytest.param({"signed_with": "other-key"}, id="signed with another key"),
    ],
)
def test_a_token_that_does_not_check_out_is_refused(supabase, bad_token):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))

    with pytest.raises(Unauthorized):
        tokens.check(supabase.token(**bad_token))


@pytest.mark.parametrize("token", ["", "not-a-token", "a.b.c"])
def test_something_that_is_not_a_token_is_refused(supabase, token):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))

    with pytest.raises(Unauthorized):
        tokens.check(token)


def test_a_token_without_a_key_id_is_refused(supabase):
    private_key, _ = supabase.keys["es-key"]
    token = jwt.encode({"sub": "x", "aud": "authenticated", "iss": supabase.issuer}, private_key, algorithm="ES256")

    with pytest.raises(Unauthorized):
        SupabaseTokens(supabase.url, supabase.fetcher("es-key")).check(token)


def test_the_keys_are_fetched_once_and_kept(supabase):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))

    for _ in range(3):
        tokens.check(supabase.token())

    assert supabase.fetches == 1


def test_a_token_naming_a_new_key_fetches_the_keys_once_more(supabase):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))
    tokens.check(supabase.token())

    supabase.published_kids.append("new-key")  # Supabase rotates its signing key
    user = tokens.check(supabase.token(kid="new-key"))

    assert user.name == "Ana Ruiz"
    assert supabase.fetches == 2


def test_a_token_naming_a_key_supabase_does_not_have_is_refused_after_one_more_fetch(supabase):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))
    tokens.check(supabase.token())

    with pytest.raises(Unauthorized):
        tokens.check(supabase.token(kid="new-key"))

    assert supabase.fetches == 2


def test_keys_that_cannot_be_used_mean_the_sign_in_service_is_unavailable(supabase):
    tokens = SupabaseTokens(supabase.url, lambda _url: {"keys": []})

    with pytest.raises(SignInUnavailable):
        tokens.check(supabase.token())


def test_a_key_set_that_cannot_be_reached_means_the_sign_in_service_is_unavailable():
    with pytest.raises(SignInUnavailable):
        fetch_json("http://127.0.0.1:9/auth/v1/.well-known/jwks.json")


def test_the_person_comes_from_the_token_only(supabase):
    tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))

    user = tokens.check(supabase.token(role="service_role", name="Someone Else", id="another-id"))

    assert (user.id, user.name) == ("7f1c0d2e-0000-4000-8000-000000000001", "Ana Ruiz")


@pytest.mark.parametrize("teammate", TEAMMATES, ids=lambda t: t.email)
def test_each_made_up_teammate_signs_in_locally(teammate):
    tokens = LocalTokens()

    user = tokens.check(tokens.sign_in(teammate.email, "local"))

    assert (user.id, user.email, user.name) == (teammate.id, teammate.email, teammate.display_name or teammate.email)


def test_a_local_email_is_matched_whatever_its_case_and_spaces():
    tokens = LocalTokens()

    assert tokens.check(tokens.sign_in("  Maya.Torres@Example.com ", "local")).name == "Maya Torres"


@pytest.mark.parametrize(
    ("email", "password"),
    [(MAYA, "wrong"), (MAYA, ""), (MAYA, "LOCAL"), ("someone@example.com", "local"), ("", "local")],
)
def test_a_wrong_password_or_an_unknown_email_is_refused(email, password):
    with pytest.raises(Unauthorized, match="That email and password don't match."):
        LocalTokens().sign_in(email, password)


def test_a_local_token_from_an_earlier_start_is_refused():
    earlier = LocalTokens().sign_in(MAYA, "local")

    with pytest.raises(Unauthorized):
        LocalTokens().check(earlier)


def test_a_supabase_token_is_refused_in_local_mode(supabase):
    with pytest.raises(Unauthorized):
        LocalTokens().check(supabase.token())


def test_jordan_has_no_display_name_so_is_known_by_email():
    tokens = LocalTokens()

    user = tokens.check(tokens.sign_in(JORDAN, "local"))

    assert (user.name, user.initials) == ("jordan@example.com", "JO")


def test_through_the_app_a_supabase_token_signs_in(signed_out_client, supabase):
    signed_out_client.app.state.tokens = SupabaseTokens(supabase.url, supabase.fetcher("es-key"))

    response = signed_out_client.get("/api/me", headers={"Authorization": f"Bearer {supabase.token()}"})

    assert response.status_code == 200
    assert response.json()["name"] == "Ana Ruiz"


def test_through_the_app_an_unreachable_sign_in_service_is_a_503_not_a_sign_out(signed_out_client, supabase):
    def unreachable(_url):
        raise SignInUnavailable("Couldn't reach the sign-in service")

    signed_out_client.app.state.tokens = SupabaseTokens(supabase.url, unreachable)

    response = signed_out_client.get("/api/me", headers={"Authorization": f"Bearer {supabase.token()}"})

    assert response.status_code == 503
