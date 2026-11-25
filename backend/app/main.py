"""Creates the FastAPI app: checks the settings and the host, runs the migrations,
seeds an empty database, adds each area's routes behind sign-in, and serves the
built frontend when there is one."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import Engine, exists, select

from app import seed
from app.account.routes import public_router as account_public_router
from app.account.routes import router as account_router
from app.activities.routes import router as activities_router
from app.contacts.routes import router as contacts_router
from app.core import config
from app.core.auth import current_user, make_token_checker
from app.core.db import make_engine, run_migrations
from app.core.errors import NotFound, add_error_handlers
from app.core.tables import activities, contacts, deals, organizations
from app.dashboard.routes import router as dashboard_router
from app.deals.routes import router as deals_router
from app.organizations.routes import router as organizations_router

SIGNED_IN_ROUTERS = (
    account_router,
    organizations_router,
    contacts_router,
    deals_router,
    activities_router,
    dashboard_router,
)


def _has_no_records(engine: Engine) -> bool:
    with engine.connect() as conn:
        return not any(
            conn.scalar(select(exists().select_from(table))) for table in (organizations, contacts, deals, activities)
        )


def _serve_frontend(app: FastAPI, dist: Path) -> None:
    """The built files, and index.html for any other address outside /api/, so a
    refreshed record page still opens. They hold no data, so need no sign-in."""
    index = dist / "index.html"

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            raise NotFound("Not found")
        file = (dist / path).resolve()
        if path and file.is_file() and file.is_relative_to(dist.resolve()):
            return FileResponse(file)
        return FileResponse(index)


def create_app(*, seed_if_empty: bool = True) -> FastAPI:
    """`seed_if_empty` is turned off only by tests that need a database with no records."""
    config.check_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = app.state.engine
        run_migrations(engine)
        # A new database, local or on Supabase, gets the sample data, so every screen has something to show (R40).
        if seed_if_empty and _has_no_records(engine):
            seed.reset(engine)
        yield
        engine.dispose()

    app = FastAPI(title="Accountable", lifespan=lifespan)
    app.state.engine = make_engine(config.database_url())
    app.state.tokens = make_token_checker()
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=config.allowed_hosts())
    add_error_handlers(app)
    app.include_router(account_public_router)
    for router in SIGNED_IN_ROUTERS:
        # Every route but the public ones needs a signed-in person (R51).
        app.include_router(router, dependencies=[Depends(current_user)])
    if (config.FRONTEND_DIST_DIR / "index.html").is_file():
        _serve_frontend(app, config.FRONTEND_DIST_DIR)
    return app


app = create_app()
