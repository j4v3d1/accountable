"""Creates the FastAPI app and adds each area's routes."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import inspect

from app import seed
from app.activities.routes import router as activities_router
from app.contacts.routes import router as contacts_router
from app.core import config
from app.core.db import create_tables, make_engine
from app.core.errors import add_error_handlers
from app.dashboard.routes import router as dashboard_router
from app.deals.routes import router as deals_router
from app.organizations.routes import router as organizations_router


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = app.state.engine
        # A new database gets the sample data, so every screen has something to show (R40).
        if not inspect(engine).has_table("organizations"):
            seed.reset(engine)
        create_tables(engine)
        yield
        engine.dispose()

    app = FastAPI(title="Accountable", lifespan=lifespan)
    app.state.engine = make_engine(config.database_url())
    add_error_handlers(app)
    for router in (organizations_router, contacts_router, deals_router, activities_router, dashboard_router):
        app.include_router(router)
    return app


app = create_app()
