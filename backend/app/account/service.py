"""What the browser needs to sign in, and who is signed in (sign-in.md)."""

from app.core import config
from app.core.auth import LocalTokens, User
from app.core.errors import NotFound


def browser_config() -> dict:
    """How the browser signs in. The publishable key is public by design."""
    if config.auth_mode() == "local":
        return {"auth": "local"}
    return {
        "auth": "supabase",
        "supabaseUrl": config.supabase_url(),
        "publishableKey": config.supabase_publishable_key(),
    }


def me(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "initials": user.initials}


def sign_in_locally(tokens: object, email: str, password: str) -> dict:
    """Local mode only (R54). Anywhere else the route doesn't exist."""
    if not isinstance(tokens, LocalTokens):
        raise NotFound("Not found")
    return {"token": tokens.sign_in(email, password)}
