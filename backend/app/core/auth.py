"""Who is signed in: checks the token on each request (R51, concern 17) and keeps the
person in `users` (R55).

Two ways to sign in (concern 16). Supabase signs the live app's tokens, and the
backend checks them with the project's public signing keys. Local mode, for
`npm run dev`, the tests and ui-check, signs tokens for made-up teammates with a
key made when the backend starts.
"""

import json
import secrets
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, Request
from sqlalchemy import Connection, select, update
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.core import config
from app.core.db import Conn
from app.core.errors import SignInUnavailable, Unauthorized
from app.core.tables import users

AUDIENCE = "authenticated"
SUPABASE_ALGORITHMS = ("ES256", "RS256")


@dataclass(frozen=True)
class User:
    id: str
    name: str
    email: str | None

    @property
    def initials(self) -> str:
        return initials(self.name, self.email)


def initials(name: str, email: str | None) -> str:
    """ "Maya Torres" is MT and "Cher" is C; someone known only by their email gets
    the first two letters before the @, so jordan@example.com is JO (R55)."""
    if email and name == email:
        return email.split("@", 1)[0][:2].upper()
    words = name.split()
    if not words:
        return ""
    first, last = words[0], words[-1]
    return (first[0] + last[0]).upper() if len(words) > 1 else first[0].upper()


def user_from_claims(claims: dict) -> User:
    """The person is the token's `sub`, `email` and `user_metadata.display_name`, and nothing else."""
    email = claims.get("email") or None
    metadata = claims.get("user_metadata")
    display_name = metadata.get("display_name") if isinstance(metadata, dict) else None
    name = display_name.strip() if isinstance(display_name, str) else ""
    return User(id=str(claims["sub"]), name=name or email or str(claims["sub"]), email=email)


def fetch_json(url: str) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return json.load(response)
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise SignInUnavailable("Couldn't reach the sign-in service") from error


class SupabaseTokens:
    """Checks tokens with Supabase's public keys, fetched once and again only when a
    token names a key that isn't known yet (concern 17)."""

    def __init__(self, project_url: str, fetch_keys: Callable[[str], dict] = fetch_json):
        self.issuer = f"{project_url.rstrip('/')}/auth/v1"
        self.keys_url = f"{self.issuer}/.well-known/jwks.json"
        self._fetch_keys = fetch_keys
        self._keys: dict[str, jwt.PyJWK] | None = None

    def _load_keys(self) -> dict[str, jwt.PyJWK]:
        try:
            key_set = jwt.PyJWKSet.from_dict(self._fetch_keys(self.keys_url))
        except jwt.PyJWTError as error:
            raise SignInUnavailable("The sign-in service sent no usable keys") from error
        return {key.key_id: key for key in key_set.keys if key.key_id}

    def _key(self, key_id: str) -> jwt.PyJWK:
        if self._keys is None or key_id not in self._keys:
            self._keys = self._load_keys()
        if key_id not in self._keys:
            raise Unauthorized("Signed with a key the sign-in service doesn't have")
        return self._keys[key_id]

    def check(self, token: str) -> User:
        try:
            key_id = jwt.get_unverified_header(token).get("kid")
        except jwt.PyJWTError as error:
            raise Unauthorized("Not a sign-in token") from error
        if not isinstance(key_id, str):
            raise Unauthorized("Not a sign-in token")
        key = self._key(key_id)
        if key.algorithm_name not in SUPABASE_ALGORITHMS:
            raise Unauthorized("Signed in a way the app doesn't accept")
        try:
            claims = jwt.decode(
                token,
                key.key,
                algorithms=[key.algorithm_name],
                audience=AUDIENCE,
                issuer=self.issuer,
                options={"require": ["exp", "sub", "aud", "iss"]},
            )
        except jwt.PyJWTError as error:
            raise Unauthorized("Your session ended. Sign in again.") from error
        return user_from_claims(claims)


@dataclass(frozen=True)
class Teammate:
    id: str
    email: str
    display_name: str | None


# The made-up teammates of local mode (R54). They all use the password "local".
TEAMMATES = [
    Teammate("local-maya-torres", "maya.torres@example.com", "Maya Torres"),
    Teammate("local-sam-okafor", "sam.okafor@example.com", "Sam Okafor"),
    Teammate("local-priya-shah", "priya.shah@example.com", "Priya Shah"),
    Teammate("local-jordan", "jordan@example.com", None),
]
LOCAL_PASSWORD = "local"
LOCAL_ISSUER = "accountable-local"
LOCAL_SESSION = timedelta(days=30)


class LocalTokens:
    """Signs and checks local-mode tokens with a key made at startup, so restarting
    the backend signs everyone out (R54)."""

    def __init__(self):
        self._secret = secrets.token_bytes(32)

    def sign_in(self, email: str, password: str) -> str:
        wanted = email.strip().lower()
        teammate = next((t for t in TEAMMATES if t.email == wanted), None)
        if teammate is None or not secrets.compare_digest(password, LOCAL_PASSWORD):
            raise Unauthorized("That email and password don't match.")
        claims = {
            "sub": teammate.id,
            "email": teammate.email,
            "user_metadata": {"display_name": teammate.display_name} if teammate.display_name else {},
            "aud": AUDIENCE,
            "iss": LOCAL_ISSUER,
            "exp": datetime.now(UTC) + LOCAL_SESSION,
        }
        return jwt.encode(claims, self._secret, algorithm="HS256")

    def check(self, token: str) -> User:
        try:
            claims = jwt.decode(
                token,
                self._secret,
                algorithms=["HS256"],
                audience=AUDIENCE,
                issuer=LOCAL_ISSUER,
                options={"require": ["exp", "sub", "aud", "iss"]},
            )
        except jwt.PyJWTError as error:
            raise Unauthorized("Your session ended. Sign in again.") from error
        return user_from_claims(claims)


def make_token_checker() -> SupabaseTokens | LocalTokens:
    if config.auth_mode() == "local":
        return LocalTokens()
    return SupabaseTokens(config.supabase_url())


def add_user(conn: Connection, user: User) -> None:
    """Add the person to `users`, unless another request has just added them: a first
    visit sends several requests at once, and each finds no row (R55)."""
    dialect_insert = sqlite_insert if conn.dialect.name == "sqlite" else postgresql_insert
    statement = dialect_insert(users).values(id=user.id, name=user.name, email=user.email)
    conn.execute(statement.on_conflict_do_nothing(index_elements=[users.c.id]))


def keep_user(conn: Connection, user: User) -> None:
    """Add the person to `users`, or update their row when their name or email has
    changed. Reads first, so most requests don't write (R55)."""
    stored = conn.execute(select(users.c.name, users.c.email).where(users.c.id == user.id)).first()
    if stored is None:
        add_user(conn, user)
    elif (stored.name, stored.email) != (user.name, user.email):
        conn.execute(update(users).where(users.c.id == user.id).values(name=user.name, email=user.email))


def _bearer_token(request: Request) -> str:
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise Unauthorized("Sign in to continue")
    return token.strip()


def current_user(request: Request, conn: Conn) -> User:
    """The signed-in person, from the token and nothing else in the request (concern 17)."""
    user = request.app.state.tokens.check(_bearer_token(request))
    keep_user(conn, user)
    return user


CurrentUser = Annotated[User, Depends(current_user)]
