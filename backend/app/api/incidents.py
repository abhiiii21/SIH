from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.incident import (
    Incident, SpillGeometry, SpillDNA, OriginZone,
    ForecastSnapshot, ImpactAssessment, ActivityLog
)
from app.schemas.incident import (
    IncidentOut, IncidentDetailOut, SpillDNAOut, OriginZoneOut,
    ImpactAssessmentOut, ActivityLogOut, SpillGeometryOut,
    IncidentStatusUpdate, IncidentNoteCreate
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


async def resolve_incident(id_or_code: str, db: AsyncSession, eager: bool = False) -> Incident:
    """Helper to query incident by either integer ID or string incident_code (e.g. 'IN-MH-2026')."""
    query = select(Incident)
    if eager:
        query = query.options(
            selectinload(Incident.spill_dna),
            selectinload(Incident.origin_zone),
            selectinload(Incident.impact_assessment),
            selectinload(Incident.spill_geometries),
            selectinload(Incident.activity_logs)
        )
    
    if id_or_code.isdigit():
        stmt = query.where(or_(Incident.id == int(id_or_code), Incident.incident_code == id_or_code))
    else:
        stmt = query.where(Incident.incident_code == id_or_code)

    res = await db.execute(stmt)
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{id_or_code}' not found"
        )
    return incident


@router.get("", response_model=List[IncidentOut])
async def list_incidents(
    status: Optional[str] = None,
    min_severity: Optional[float] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident)
    filters = []
    if status and status.lower() != "all":
        filters.append(Incident.status == status.lower())
    if min_severity is not None:
        filters.append(Incident.severity_score >= min_severity)
    if region:
        filters.append(Incident.region_name.ilike(f"%{region}%"))
    if search:
        filters.append(or_(
            Incident.incident_code.ilike(f"%{search}%"),
            Incident.title.ilike(f"%{search}%"),
            Incident.region_name.ilike(f"%{search}%")
        ))
    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Incident.detected_at.desc()).offset(offset).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/{id_or_code}", response_model=IncidentDetailOut)
async def get_incident(id_or_code: str, db: AsyncSession = Depends(get_db)):
    return await resolve_incident(id_or_code, db, eager=True)


@router.get("/{id_or_code}/spill-dna", response_model=SpillDNAOut)
async def get_incident_spill_dna(id_or_code: str, db: AsyncSession = Depends(get_db)):
    incident = await resolve_incident(id_or_code, db)
    stmt = select(SpillDNA).where(SpillDNA.incident_id == incident.id)
    dna = (await db.execute(stmt)).scalar_one_or_none()
    if not dna:
        raise HTTPException(status_code=404, detail="Spill DNA record not found for this incident")
    return dna


@router.get("/{id_or_code}/origin-zone", response_model=OriginZoneOut)
async def get_incident_origin_zone(id_or_code: str, db: AsyncSession = Depends(get_db)):
    incident = await resolve_incident(id_or_code, db)
    stmt = select(OriginZone).where(OriginZone.incident_id == incident.id)
    zone = (await db.execute(stmt)).scalar_one_or_none()
    if not zone:
        raise HTTPException(status_code=404, detail="Origin zone not found for this incident")
    return zone


@router.get("/{id_or_code}/spill-evolution")
async def get_spill_evolution(id_or_code: str, db: AsyncSession = Depends(get_db)):
    incident = await resolve_incident(id_or_code, db)
    # Fetch historical geometries
    stmt_geom = select(SpillGeometry).where(SpillGeometry.incident_id == incident.id).order_by(SpillGeometry.captured_at.asc())
    geometries = (await db.execute(stmt_geom)).scalars().all()

    # Fetch forecast snapshots
    stmt_fc = select(ForecastSnapshot).where(ForecastSnapshot.incident_id == incident.id).order_by(ForecastSnapshot.forecast_for_time.asc())
    forecasts = (await db.execute(stmt_fc)).scalars().all()

    timeline = []
    for g in geometries:
        timeline.append({
            "type": "observed",
            "id": g.id,
            "timestamp": g.captured_at.isoformat(),
            "geometry": g.geometry,
            "source": g.source,
            "confidence_score": g.confidence_score
        })
    for f in forecasts:
        timeline.append({
            "type": "forecast",
            "id": f.id,
            "timestamp": f.forecast_for_time.isoformat(),
            "geometry": f.forecast_geometry,
            "source": f"Lagrangian Forecast {f.model_version}",
            "confidence_score": 0.85
        })

    return {
        "incident_code": incident.incident_code,
        "total_snapshots": len(timeline),
        "timeline": sorted(timeline, key=lambda x: x["timestamp"])
    }


@router.get("/{id_or_code}/impact-assessment", response_model=ImpactAssessmentOut)
async def get_incident_impact_assessment(id_or_code: str, db: AsyncSession = Depends(get_db)):
    incident = await resolve_incident(id_or_code, db)
    stmt = select(ImpactAssessment).where(ImpactAssessment.incident_id == incident.id)
    assessment = (await db.execute(stmt)).scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Impact assessment not found for this incident")
    return assessment


@router.get("/{id_or_code}/activity-log", response_model=List[ActivityLogOut])
async def get_incident_activity_log(id_or_code: str, db: AsyncSession = Depends(get_db)):
    incident = await resolve_incident(id_or_code, db)
    stmt = select(ActivityLog).where(ActivityLog.incident_id == incident.id).order_by(ActivityLog.occurred_at.asc())
    logs = (await db.execute(stmt)).scalars().all()
    return logs


@router.post("/{id_or_code}/notes")
async def add_incident_note(
    id_or_code: str,
    note_in: IncidentNoteCreate,
    db: AsyncSession = Depends(get_db)
):
    incident = await resolve_incident(id_or_code, db)
    log_entry = ActivityLog(
        incident_id=incident.id,
        event_text=note_in.note,
        status="done",
        occurred_at=datetime.now(timezone.utc)
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    return {"message": "Incident note recorded successfully", "log_id": log_entry.id, "occurred_at": log_entry.occurred_at}


@router.patch("/{id_or_code}/status", response_model=IncidentOut)
async def update_incident_status(
    id_or_code: str,
    status_update: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    incident = await resolve_incident(id_or_code, db)
    valid_statuses = ["detection", "analysis", "attribution", "response_planning", "closed"]
    if status_update.status.lower() not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status_update.status}'. Allowed: {valid_statuses}"
        )

    incident.status = status_update.status.lower()
    incident.updated_at = datetime.now(timezone.utc)

    # Log transition
    log_entry = ActivityLog(
        incident_id=incident.id,
        event_text=f"Incident workflow state transitioned to '{incident.status.upper()}'.",
        status="done",
        occurred_at=datetime.now(timezone.utc)
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(incident)
    return incident
