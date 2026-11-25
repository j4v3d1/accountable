from pydantic import BaseModel


class ConfigOut(BaseModel):
    auth: str
    supabaseUrl: str | None = None
    publishableKey: str | None = None


class HealthOut(BaseModel):
    ok: bool


class MeOut(BaseModel):
    id: str
    name: str
    email: str | None
    initials: str


class LocalSignIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    token: str
