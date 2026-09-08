"""
The local service the portal reads from and writes to.

Two routes and a health check: the whole dataset out, the whole dataset back.
It binds to loopback and holds no secrets — the roles never leave this desk.
"""

from __future__ import annotations

import argparse
import os
import sys
import traceback
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException

import db

DEFAULT_PORT = 8765


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Runs once when the service starts, and again on the way out."""
    db.connect()

    yield          # <-- the service serves requests here

    db.close()


app = FastAPI(title="Screener store", version="1.0", lifespan=lifespan)

# The portal is served by Vite on another port, so every request here is
# cross-origin. The service is bound to loopback and holds no secrets, so it
# answers anything on this machine rather than tracking whichever port Vite
# settled on today.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,
)


def _fail(message: str, status: int = 400):
    """Every error out of this service looks the same to the browser."""
    raise HTTPException(status_code=status, detail=message or "something went wrong")


# ---------------------------------------------------------------- health

@app.get("/health")
async def health():
    """Is the service up, and is the database readable?"""
    return {"ok": True, "service": "screener-store", "store": _store_health()}


def _store_health():
    try:
        return {"available": True, "empty": db.is_empty(), **db.stats()}
    except Exception as exc:
        # the portal has to be able to tell "no database" from "no data"
        return {"available": False, "error": str(exc) or exc.__class__.__name__}


# ---------------------------------------------------------------- the store

@app.get("/api/state")
async def read_state():
    return await run_in_threadpool(db.read_state)


@app.put("/api/state")
async def write_state(state=Body(...)):
    if not isinstance(state, dict):
        _fail("the state must be an object")
    await run_in_threadpool(db.write_state, state)
    return {"ok": True, "savedAt": db.now_ms()}


# ---------------------------------------------------------------- error shape

@app.exception_handler(StarletteHTTPException)
async def http_error(_request: Request, exc: StarletteHTTPException):
    # Starlette's class rather than FastAPI's, because the 404 for an unknown
    # URL is raised by the router itself and never passes through our code.
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def bad_request(_request: Request, exc: RequestValidationError):
    return JSONResponse({"error": f"that request could not be read: {exc.errors()}"},
                        status_code=400)


@app.exception_handler(Exception)
async def crashed(_request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse({"error": str(exc) or exc.__class__.__name__}, status_code=500)


# ---------------------------------------------------------------- lifecycle

def main():
    import uvicorn

    ap = argparse.ArgumentParser(description="Local store for the Screener portal")
    ap.add_argument("--port", type=int,
                    default=int(os.environ.get("SCREENER_ANALYZER_PORT", DEFAULT_PORT)))
    ap.add_argument("--host", default=os.environ.get("SCREENER_ANALYZER_HOST", "127.0.0.1"))
    ap.add_argument("--reload", action="store_true", help="restart when this code changes")
    args = ap.parse_args()

    print(f"Screener store listening on http://{args.host}:{args.port}")
    print(f"  database: {db.DB_PATH}")
    print(f"  docs:     http://{args.host}:{args.port}/docs")
    print("Ctrl-C to stop.")

    # "info" rather than "warning" so every request is logged. When the portal
    # says "Failed to fetch" the only question worth answering is whether the
    # request ever arrived, and a quiet log cannot answer it.
    uvicorn.run("server:app" if args.reload else app,
                host=args.host, port=args.port, reload=args.reload, log_level="info")


if __name__ == "__main__":
    main()
