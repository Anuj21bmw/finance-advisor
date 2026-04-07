"""
Finance Advisor FastAPI Backend
Serves on port 8000. Mount routers for advisor, documents, calculators, and market data.
"""
import sys
import os

# Add project root to Python path so `src.*` imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from loguru import logger

from backend.routers import advisor, documents, calculators, market

# ── App Init ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Finance Advisor API",
    description="AI-powered personal finance advisor for Indian investors",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(advisor.router)
app.include_router(documents.router)
app.include_router(calculators.router)
app.include_router(market.router)

# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.get("/", tags=["root"])
async def root():
    return {"message": "Finance Advisor API", "version": "1.0.0", "docs": "/docs"}


# ── Exception Handlers ────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
