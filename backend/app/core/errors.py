"""Errors the services raise, turned into HTTP responses in one place."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class NotFound(Exception):
    """A record that doesn't exist: 404."""


class Conflict(Exception):
    """A change the record doesn't allow, such as editing a stage change: 409."""


class Invalid(Exception):
    """Input that passed the schema but can't be used, such as a link to a missing record: 422."""

    def __init__(self, field: str, message: str, value: object = None):
        super().__init__(message)
        self.field = field
        self.message = message
        self.value = value


def add_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFound)
    async def _not_found(_request: Request, exc: NotFound):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(Conflict)
    async def _conflict(_request: Request, exc: Conflict):
        return JSONResponse(status_code=409, content={"detail": str(exc)})

    @app.exception_handler(Invalid)
    async def _invalid(_request: Request, exc: Invalid):
        # The same shape as FastAPI's own validation errors.
        detail = [{"type": "value_error", "loc": ["body", exc.field], "msg": exc.message, "input": exc.value}]
        return JSONResponse(status_code=422, content={"detail": detail})
