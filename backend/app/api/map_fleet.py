from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.incident import Incident, SpillGeometry
from app.models.vessel import Vessel
from app.schemas.vessel import VesselOut, ASIEventOut

router = APIRouter(prefix="/map", tags=["Map"])


@router.get("/incidents")
async def get_map_incidents(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Incident)
        .options(selectinload(Incident.spill_geometries))
        .where(Incident.status != "closed")
    )
    incidents = (await db.execute(stmt)).scalars().all()

    out = []
    for inc in incidents:
        latest_geom = None
        if inc.spill_geometries:
            latest_sg = max(inc.spill_geometries, key=lambda g: g.captured_at)
            latest_geom = latest_sg.geometry

        out.append({
            "id": inc.id,
            "incident_code": inc.incident_code,
            "title": inc.title,
            "status": inc.status,
            "severity_score": inc.severity_score,
            "spill_area_km2": inc.spill_area_km2,
            "location": inc.location,
            "region_name": inc.region_name,
            "detected_at": inc.detected_at.isoformat(),
            "geometry": latest_geom or inc.location,
        })
    return out


@router.get("/vessels", response_model=List[VesselOut])
async def get_map_vessels(
    bounds: Optional[str] = Query(None, description="Bounding box: minLon,minLat,maxLon,maxLat"),
    limit: int = Query(150, ge=1, le=300),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Vessel).options(selectinload(Vessel.asi_events), selectinload(Vessel.positions)).limit(limit)
    vessels = (await db.execute(stmt)).scalars().all()

    parsed_bounds = None
    if bounds:
        try:
            parts = [float(p.strip()) for p in bounds.split(",")]
            if len(parts) == 4:
                parsed_bounds = parts  # [minLon, minLat, maxLon, maxLat]
        except Exception:
            parsed_bounds = None

    out = []
    for v in vessels:
        v_out = VesselOut(
            id=v.id,
            imo_number=v.imo_number,
            mmsi=v.mmsi,
            name=v.name,
            vessel_type=v.vessel_type,
            flag_country=v.flag_country,
            built_year=v.built_year,
            asi_events=[ASIEventOut.model_validate(e) for e in v.asi_events]
        )
        if v.positions:
            latest_p = max(v.positions, key=lambda p: p.recorded_at)
            v_out.latest_position = latest_p.position
            v_out.speed_kts = latest_p.speed_kts
            v_out.heading_deg = latest_p.heading_deg

            if parsed_bounds:
                coords = latest_p.position.get("coordinates", [0, 0])
                lon, lat = coords[0], coords[1]
                min_lon, min_lat, max_lon, max_lat = parsed_bounds
                if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                    continue

        out.append(v_out)

    return out
