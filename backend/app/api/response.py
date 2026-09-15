import math
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.incident import Incident
from app.models.response import ResponseAction, PriorityZone
from app.models.environmental import CoastGuardAsset
from app.schemas.response import (
    ResponseActionOut, ResponseActionUpdate, PriorityZoneOut, CoastGuardAssetOut
)

router = APIRouter(tags=["Response & Assets"])


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


@router.get("/incidents/{incident_id_or_code}/response-actions", response_model=List[ResponseActionOut])
async def get_response_actions(incident_id_or_code: str, db: AsyncSession = Depends(get_db)):
    if incident_id_or_code.isdigit():
        stmt = select(Incident).where(or_(Incident.id == int(incident_id_or_code), Incident.incident_code == incident_id_or_code))
    else:
        stmt = select(Incident).where(Incident.incident_code == incident_id_or_code)
    incident = (await db.execute(stmt)).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    act_stmt = select(ResponseAction).where(ResponseAction.incident_id == incident.id).order_by(ResponseAction.sequence_order.asc())
    actions = (await db.execute(act_stmt)).scalars().all()
    return actions


@router.patch("/response-actions/{action_id}", response_model=ResponseActionOut)
async def update_response_action(action_id: int, update: ResponseActionUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(ResponseAction).where(ResponseAction.id == action_id)
    action = (await db.execute(stmt)).scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Response action not found")

    action.status = update.status
    if update.status == "completed" and not action.completed_at:
        action.completed_at = datetime.now(timezone.utc)
    elif update.status == "pending":
        action.completed_at = None

    await db.commit()
    await db.refresh(action)
    return action


@router.get("/incidents/{incident_id_or_code}/priority-zones", response_model=List[PriorityZoneOut])
async def get_priority_zones(incident_id_or_code: str, db: AsyncSession = Depends(get_db)):
    if incident_id_or_code.isdigit():
        stmt = select(Incident).where(or_(Incident.id == int(incident_id_or_code), Incident.incident_code == incident_id_or_code))
    else:
        stmt = select(Incident).where(Incident.incident_code == incident_id_or_code)
    incident = (await db.execute(stmt)).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    pz_stmt = select(PriorityZone).where(PriorityZone.incident_id == incident.id).order_by(PriorityZone.priority_rank.asc())
    zones = (await db.execute(pz_stmt)).scalars().all()
    return zones


@router.get("/coast-guard-assets/nearby")
async def get_nearby_coast_guard_assets(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(CoastGuardAsset)
    assets = (await db.execute(stmt)).scalars().all()

    out = []
    for a in assets:
        coords = a.current_location.get("coordinates", [72.5, 18.8])
        a_lon = coords[0]
        a_lat = coords[1]
        dist_km = 0.0
        if lat is not None and lng is not None:
            dist_km = round(haversine_km(lng, lat, a_lon, a_lat), 1)

        out.append({
            "id": a.id,
            "name": a.name,
            "asset_type": a.asset_type,
            "current_location": a.current_location,
            "status": a.status,
            "distance_km": dist_km,
            "coordinates": [a_lat, a_lon],
        })

    if lat is not None and lng is not None:
        out.sort(key=lambda x: x["distance_km"])

    return out
