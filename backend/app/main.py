import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.incident import Incident
from app.db.seed import seed_database
from app.api import (
    auth, incidents, vessels, counterfactual,
    forecast, response, recovery, ports, reports,
    map_fleet, websockets, ai
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and database is seeded
    print("Initializing Sahayya API backend...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Check if seed data exists
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Incident).limit(1))
        has_data = res.scalar_one_or_none()
        if not has_data:
            print("No existing incidents found in database. Running automatic seeder...")
            await seed_database()
        else:
            print("Existing database records detected. Ready to serve requests.")

    yield

    # Shutdown
    print("Shutting down Sahayya API backend engine...")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Maritime Oil Spill Defense, Forensic Trajectory Reconstruction, and Vessel Attribution API for Indian Waters.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development and production cross-origin frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local reports storage static mount
LOCAL_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "reports")
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
app.mount("/storage/reports", StaticFiles(directory=LOCAL_STORAGE_DIR), name="reports_storage")

# Register Routers
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(vessels.router)
app.include_router(counterfactual.router)
app.include_router(forecast.router)
app.include_router(response.router)
app.include_router(recovery.router)
app.include_router(ports.router)
app.include_router(reports.router)
app.include_router(map_fleet.router)
app.include_router(websockets.router)
app.include_router(ai.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "documentation": "/docs",
        "timestamp": "2026-09-14T21:30:00Z"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "database": "connected"}
