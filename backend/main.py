"""
Finance Advisor FastAPI Backend
Serves on port 8000. Auth-protected routes, SQLite user DB, JWT tokens.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from loguru import logger

from backend.database import init_db
from backend.routers import advisor, documents, calculators, market
from backend.routers.auth_router import router as auth_router

# ── App Init ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Finance Advisor API",
    description="AI-powered personal finance advisor for Indian investors",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB Init on startup ────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    init_db()
    logger.info("Database initialized")

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router)          # /api/auth/* — public
app.include_router(advisor.router)       # /api/advisor/* — protected inside router
app.include_router(documents.router)
app.include_router(calculators.router)
app.include_router(market.router)        # /api/market/* — public (no login needed for prices)

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": "2.0.0"}

@app.get("/", tags=["root"])
async def root():
    return {"message": "Finance Advisor API", "docs": "/docs"}

# ── Exception Handler ─────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})

# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
