from fastapi import APIRouter, Request

from app.account import service
from app.account.schemas import ConfigOut, HealthOut, LocalSignIn, MeOut, TokenOut
from app.core.auth import CurrentUser

# Answered signed out (R51).
public_router = APIRouter(prefix="/api", tags=["account"])
router = APIRouter(prefix="/api", tags=["account"])


@public_router.get("/config", response_model=ConfigOut, response_model_exclude_none=True)
def get_config():
    return service.browser_config()


@public_router.get("/health", response_model=HealthOut)
def health():
    return {"ok": True}


@public_router.post("/auth/local", response_model=TokenOut)
def sign_in_locally(body: LocalSignIn, request: Request):
    return service.sign_in_locally(request.app.state.tokens, body.email, body.password)


@router.get("/me", response_model=MeOut)
def get_me(user: CurrentUser):
    return service.me(user)
