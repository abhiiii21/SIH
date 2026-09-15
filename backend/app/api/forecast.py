from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.incident import Incident
from app.models.environmental import EnvironmentalReading
from app.schemas.simulation import ForecastResponse
from app.services.drift_simulation import simulate_forecast

router = APIRouter(tags=["Forecast & Simulation"])


@router.get("/incidents/{incident_id_or_code}/forecast", response_model=ForecastResponse)
async def get_incident_forecast(
    incident_id_or_code: str,
    hours: int = Query(24, ge=6, le=72),
    db: AsyncSession = Depends(get_db)
):
    if incident_id_or_code.isdigit():
        stmt = select(Incident).where(or_(Incident.id == int(incident_id_or_code), Incident.incident_code == incident_id_or_code))
    else:
        stmt = select(Incident).where(Incident.incident_code == incident_id_or_code)
    incident = (await db.execute(stmt)).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    coords = incident.location.get("coordinates", [72.51, 18.78])
    center_lon = coords[0]
    center_lat = coords[1]

    # Fetch recent environmental readings for driving simulation
    env_stmt = (
        select(EnvironmentalReading)
        .where(EnvironmentalReading.incident_id == incident.id)
        .order_by(EnvironmentalReading.recorded_at.desc())
        .limit(10)
    )
    env_rows = (await db.execute(env_stmt)).scalars().all()

    env_dicts = []
    for r in env_rows:
        env_dicts.append({
            "wind_speed_ms": r.wind_speed_ms,
            "wind_direction_deg": r.wind_direction_deg,
            "current_speed_ms": r.current_speed_ms,
            "current_direction_deg": r.current_direction_deg,
        })

    snapshots = simulate_forecast(
        center_lon=center_lon,
        center_lat=center_lat,
        hours=hours,
        env_readings=env_dicts
    )

    return ForecastResponse(
        incident_id=incident.id,
        hours=hours,
        generated_at=datetime.now(timezone.utc),
        snapshots=snapshots
    )
