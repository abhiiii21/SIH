from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.vessel import Vessel
from app.services.ollama_service import ollama_service

router = APIRouter(prefix="/ai", tags=["AI & Ollama Intelligence"])


class AIConfigUpdate(BaseModel):
    base_url: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    gemini_model: Optional[str] = None


class AIChatRequest(BaseModel):
    prompt: str
    vessel_id: Optional[int] = None
    vessel_context: Optional[Dict[str, Any]] = None


@router.get("/status")
async def get_ai_status():
    """Check Ollama & Google Gemini AI connectivity and configured model/key status."""
    return await ollama_service.check_health()


@router.post("/config")
async def update_ai_config(body: AIConfigUpdate):
    """Update Ollama and Google Gemini AI keys, endpoints, and models dynamically."""
    ollama_service.update_config(
        base_url=body.base_url,
        model=body.model,
        api_key=body.api_key,
        google_api_key=body.google_api_key,
        gemini_model=body.gemini_model,
    )
    health = await ollama_service.check_health()
    return {
        "message": "AI Intelligence configuration updated successfully",
        "current_config": {
            "base_url": ollama_service.base_url,
            "model": ollama_service.model,
            "has_ollama_key": bool(ollama_service.api_key and ollama_service.api_key.strip()),
            "gemini_model": ollama_service.gemini_model,
            "has_google_key": bool(ollama_service.google_api_key and ollama_service.google_api_key.strip()),
        },
        "health": health,
    }


@router.get("/vessels/{vessel_id}/analysis")
async def analyze_vessel_by_id(vessel_id: int, db: AsyncSession = Depends(get_db)):
    """Generate dynamic Ollama AI intelligence analysis for a specific vessel from the 142 fleet."""
    stmt = (
        select(Vessel)
        .options(selectinload(Vessel.asi_events), selectinload(Vessel.positions))
        .where(Vessel.id == vessel_id)
    )
    vessel = (await db.execute(stmt)).scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail=f"Vessel {vessel_id} not found")

    coords = [18.78, 72.51]
    speed = 12.0
    heading = 45.0
    if vessel.positions:
        latest_p = max(vessel.positions, key=lambda p: p.recorded_at)
        coords = [latest_p.position.get("coordinates", [72.51, 18.78])[1], latest_p.position.get("coordinates", [72.51, 18.78])[0]]
        speed = latest_p.speed_kts
        heading = latest_p.heading_deg

    # Calculate distance to Mumbai High incident core (18.78N, 72.51E)
    lat_diff = (coords[0] - 18.78) * 111.0
    lon_diff = (coords[1] - 72.51) * 105.0
    dist_km = round((lat_diff**2 + lon_diff**2)**0.5, 1)

    vessel_dict = {
        "id": vessel.id,
        "name": vessel.name,
        "type": vessel.vessel_type,
        "flag": vessel.flag_country,
        "imo": vessel.imo_number,
        "mmsi": vessel.mmsi,
        "speedKnots": speed,
        "heading": heading,
        "coordinates": coords,
        "distanceKm": dist_km,
        "status": "Flagged" if vessel.asi_events else "Normal",
        "asiEvents": [
            {
                "id": str(e.id),
                "event": e.event_type,
                "severity": e.severity,
                "details": e.description,
            }
            for e in vessel.asi_events
        ],
    }

    return await ollama_service.generate_vessel_intelligence(vessel_dict)


@router.post("/vessels/analysis")
async def analyze_vessel_payload(vessel: Dict[str, Any] = Body(...)):
    """Analyze arbitrary vessel data dictionary with Ollama AI."""
    return await ollama_service.generate_vessel_intelligence(vessel)


@router.post("/chat")
async def ai_chat(req: AIChatRequest, db: AsyncSession = Depends(get_db)):
    """Interactive interrogation endpoint for maritime intelligence."""
    context = req.vessel_context
    if not context and req.vessel_id:
        stmt = select(Vessel).options(selectinload(Vessel.positions)).where(Vessel.id == req.vessel_id)
        vessel = (await db.execute(stmt)).scalar_one_or_none()
        if vessel:
            context = {"id": vessel.id, "name": vessel.name, "type": vessel.vessel_type, "flag": vessel.flag_country}

    reply = await ollama_service.chat(prompt=req.prompt, vessel_context=context)
    return {
        "reply": reply,
        "model": ollama_service.model,
        "vessel_id": req.vessel_id,
    }
