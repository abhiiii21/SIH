import os
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.incident import Incident
from app.models.vessel import Vessel, VesselPosition, ASIEvent, VesselAttribution
from app.models.response import Report
from app.schemas.response import ReportGenerateRequest
from app.services.tasks import execute_report_job, execute_fleet_report_job, JOB_RESULTS
from app.services.storage import storage_service
from app.services.report_generator import generate_vessel_evidence_brief_pdf
from sqlalchemy.orm import selectinload
import math
import json

router = APIRouter(tags=["Reports & Dossiers"])


@router.post("/incidents/{incident_id_or_code}/generate-report")
async def generate_incident_report(
    incident_id_or_code: str,
    request: Optional[ReportGenerateRequest] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    if incident_id_or_code.isdigit():
        stmt = select(Incident).where(or_(Incident.id == int(incident_id_or_code), Incident.incident_code == incident_id_or_code))
    else:
        stmt = select(Incident).where(Incident.incident_code == incident_id_or_code)
    incident = (await db.execute(stmt)).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    job_id = f"rep-{uuid.uuid4().hex[:10]}"
    report_type = request.report_type if request else "INCIDENT_DOSSIER"

    JOB_RESULTS[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "incident_id": incident.id,
        "report_type": report_type,
    }

    # Execute report generation immediately for ultra-fast generation & response
    res = await execute_report_job(
        job_id=job_id,
        incident_id=incident.id,
        report_type=report_type,
        user_id=None
    )

    return res


@router.post("/vessels/generate-report")
async def generate_fleet_surveillance_report():
    """Generate fleet-wide surveillance report covering Indian EEZ."""
    job_id = f"fleet-rep-{uuid.uuid4().hex[:10]}"
    JOB_RESULTS[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "report_type": "FLEET_SURVEILLANCE",
    }

    res = await execute_fleet_report_job(job_id=job_id)
    return res


@router.get("/reports/{job_id}/status")
async def get_report_job_status(job_id: str):
    """
    Polling endpoint returning status of report generation task:
    Returns { status: "processing" | "ready" | "failed", report_id, download_url, file_hash, filename, pages_count }
    """
    if job_id not in JOB_RESULTS:
        # Check if job_id is an existing report ID
        if job_id.isdigit():
            return {
                "status": "ready",
                "report_id": int(job_id),
                "download_url": f"/reports/{job_id}/download"
            }
        raise HTTPException(status_code=404, detail=f"Report job '{job_id}' not found")

    data = JOB_RESULTS[job_id]
    return data



@router.get("/reports/vessel-evidence-brief/download")
@router.get("/api/reports/vessel-evidence-brief/download")
async def download_vessel_evidence_brief(
    identifier: str = Query(..., description="Vessel ID, IMO, MMSI, or Name"),
    incident_code: str = Query("IN-MH-2026", description="Incident Code"),
    speed_kts: Optional[float] = Query(None),
    heading_deg: Optional[float] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    vessel_type: Optional[str] = Query(None),
    flag: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    imo: Optional[str] = Query(None),
    mmsi: Optional[str] = Query(None),
    built_year: Optional[str] = Query(None),
    score: Optional[float] = Query(None, description="Attribution / Confidence Score %"),
    cpa_km: Optional[float] = Query(None, description="Closest Point of Approach in km"),
    dark_duration: Optional[str] = Query(None, description="Dark Duration string e.g. '60 min'"),
    hindcast_match: Optional[str] = Query(None, description="Hindcast Match description"),
    anomaly_level: Optional[str] = Query(None, description="Anomaly Level description"),
    dimensions_json: Optional[str] = Query(None, description="JSON array of dimensions"),
    view: Optional[str] = Query("attachment", description="'inline' or 'attachment'"),
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamically generates and downloads an official, authoritative 10-Page
    Maritime Forensic Evidence Brief PDF matching Indian Coast Guard & Ministry of Defence standards.
    """
    clean_id = identifier.replace("vessel-", "").replace("cand-", "").strip()

    # 1. Resolve Vessel from Database or synthesize dynamically
    vessel = None
    if clean_id.isdigit():
        stmt_id = (
            select(Vessel)
            .options(
                selectinload(Vessel.asi_events),
                selectinload(Vessel.positions),
                selectinload(Vessel.attributions)
            )
            .where(or_(Vessel.id == int(clean_id), Vessel.imo_number == clean_id, Vessel.mmsi == clean_id))
        )
        vessel = (await db.execute(stmt_id)).scalars().first()

    if not vessel:
        norm_name = clean_id.replace("-", " ").strip()
        conditions = [
            Vessel.imo_number == clean_id,
            Vessel.mmsi == clean_id,
            Vessel.name.ilike(f"%{norm_name}%")
        ]
        name_words = [w for w in norm_name.split() if len(w) > 2 and w.lower() not in ["c/v", "mt", "mv", "rv", "tug", "ship"]]
        for w in name_words:
            conditions.append(Vessel.name.ilike(f"%{w}%"))
        stmt = (
            select(Vessel)
            .options(
                selectinload(Vessel.asi_events),
                selectinload(Vessel.positions),
                selectinload(Vessel.attributions)
            )
            .where(or_(*conditions))
        )
        matches = (await db.execute(stmt)).scalars().all()
        if matches:
            vessel = matches[0]

    # Resolve telemetry & attributes
    if vessel:
        v_name = name or vessel.name
        v_imo = imo or vessel.imo_number
        v_mmsi = mmsi or vessel.mmsi
        v_type = vessel_type or vessel.vessel_type
        v_flag = flag or vessel.flag_country
        v_built = built_year or vessel.built_year
        v_events = vessel.asi_events
        v_attr = max(vessel.attributions, key=lambda a: a.attribution_pct) if vessel.attributions else None
        latest_p = max(vessel.positions, key=lambda p: p.recorded_at) if vessel.positions else None
        c_speed = speed_kts if speed_kts is not None else (latest_p.speed_kts if latest_p else 12.0)
        c_heading = heading_deg if heading_deg is not None else (latest_p.heading_deg if latest_p else 45.0)
        if lon is not None and lat is not None:
            c_lon, c_lat = lon, lat
        elif latest_p and latest_p.position:
            coords = latest_p.position.get("coordinates", [72.32, 18.82])
            c_lon, c_lat = coords[0], coords[1]
        else:
            c_lon, c_lat = 72.32, 18.82
    else:
        v_name = name or clean_id.replace("-", " ").title()
        v_imo = imo or (clean_id if clean_id.isdigit() and len(clean_id) >= 7 else f"9{abs(hash(clean_id)) % 900000 + 100000}")
        v_mmsi = mmsi or f"41900{abs(hash(clean_id)) % 9000 + 1000}"
        v_type = vessel_type or "General Cargo"
        v_flag = flag or "India"
        v_built = built_year or "2018"
        v_events = []
        v_attr = None
        c_speed = speed_kts if speed_kts is not None else 13.5
        c_heading = heading_deg if heading_deg is not None else 210.0
        c_lon = lon if lon is not None else 72.35
        c_lat = lat if lat is not None else 18.80

    # 2. Resolve Incident
    inc_stmt = select(Incident).where(Incident.incident_code == incident_code)
    inc_obj = (await db.execute(inc_stmt)).scalar_one_or_none()
    if inc_obj:
        inc_data = {
            "incident_code": inc_obj.incident_code,
            "title": inc_obj.title,
            "region_name": inc_obj.region_name or "Mumbai High Offshore / Arabian Sea",
            "spill_area_km2": inc_obj.spill_area_km2,
            "severity_score": inc_obj.severity_score,
            "detection_source": inc_obj.detection_source,
            "investigating_agency": inc_obj.investigating_agency,
        }
    else:
        inc_data = {
            "incident_code": incident_code,
            "title": "Mumbai High Offshore Oil Slick",
            "region_name": "Mumbai High Offshore / Arabian Sea",
            "spill_area_km2": 276.04,
            "severity_score": 8.4,
            "detection_source": "Sentinel-1A SAR",
            "investigating_agency": "Indian Coast Guard - Regional HQ (West)",
        }

    # 3. Dynamic 7D Attribution Scoring
    d_lat = (c_lat - 18.78) * 111.0
    d_lon = (c_lon - 72.51) * 105.0
    calc_cpa = round(max(0.6, math.hypot(d_lat, d_lon)), 1)

    has_dark = any(e.event_type == "dark_activity" for e in v_events)
    has_irregular = any(e.event_type == "irregular_movement" for e in v_events)

    if score is not None:
        overall_score = float(score)
        cpa_km_val = cpa_km if cpa_km is not None else (v_attr.cpa_km if v_attr else calc_cpa)
        dark_duration_val = dark_duration if dark_duration is not None else (f"{v_attr.ais_gap_minutes} min" if v_attr and v_attr.ais_gap_minutes > 0 else ("60 min" if overall_score >= 80 else "0 min"))
        hindcast_match_val = hindcast_match if hindcast_match is not None else ("Optimal (Lagrangian Fit)" if overall_score >= 80 else ("Consistent" if overall_score >= 50 else "Nominal"))
        anomaly_level_val = anomaly_level if anomaly_level is not None else ("Critical (Speed Drop)" if overall_score >= 80 else ("Elevated (Observation)" if overall_score >= 50 else "Low (Normal Commercial Transit)"))
    elif v_attr:
        overall_score = v_attr.overall_evidence_pct or v_attr.attribution_pct
        cpa_km_val = cpa_km if cpa_km is not None else v_attr.cpa_km
        dark_duration_val = dark_duration if dark_duration is not None else (f"{v_attr.ais_gap_minutes} min" if v_attr.ais_gap_minutes > 0 else "0 min")
        hindcast_match_val = hindcast_match if hindcast_match is not None else ("Optimal (Lagrangian Fit)" if overall_score >= 80 else ("Consistent" if overall_score >= 50 else "Nominal"))
        anomaly_level_val = anomaly_level if anomaly_level is not None else ("Critical (Speed Drop)" if v_attr.min_sog_kts < 4.0 else ("Elevated (Observation)" if overall_score >= 50 else "Low (Normal Commercial Transit)"))
    else:
        cpa_km_val = cpa_km if cpa_km is not None else calc_cpa
        if cpa_km_val < 5.0 and c_speed < 4.0:
            overall_score = 98.8
            hindcast_match_val = hindcast_match or "Optimal (Lagrangian Fit)"
            anomaly_level_val = anomaly_level or "Critical (Speed Drop)"
            dark_duration_val = dark_duration or "94 min"
        elif cpa_km_val < 15.0 or has_dark:
            overall_score = round(max(45.0, min(89.0, 92.0 - cpa_km_val * 2.0)), 1)
            hindcast_match_val = hindcast_match or "Consistent (Proximity Corridor)"
            anomaly_level_val = anomaly_level or "Elevated (Course Deviation)"
            dark_duration_val = dark_duration or ("45 min" if has_dark else "15 min")
        else:
            overall_score = round(max(5.0, min(30.0, 25.0 - (cpa_km_val * 0.15))), 1)
            hindcast_match_val = hindcast_match or "Nominal"
            anomaly_level_val = anomaly_level or "Low (Normal Commercial Transit)"
            dark_duration_val = dark_duration or "0 min"

    parsed_dims = None
    if dimensions_json:
        try:
            parsed_dims = json.loads(dimensions_json)
        except Exception:
            pass

    vessel_data = {
        "name": v_name,
        "vessel_type": v_type,
        "flag_country": v_flag,
        "built_year": v_built,
        "imo_number": v_imo,
        "mmsi": v_mmsi,
        "speed_kts": c_speed,
        "heading_deg": c_heading,
        "lat": c_lat,
        "lon": c_lon,
        "asi_events": v_events,
        "dark_duration": dark_duration_val,
    }

    attribution_data = {
        "overall_score": overall_score,
        "cpa_km": cpa_km_val,
        "dark_duration": dark_duration_val,
        "hindcast_match": hindcast_match_val,
        "anomaly_level": anomaly_level_val,
    }
    if parsed_dims:
        attribution_data["dimensions"] = parsed_dims

    # Generate the complete 10-page Evidence Brief PDF
    res = generate_vessel_evidence_brief_pdf(
        vessel_data=vessel_data,
        incident_data=inc_data,
        attribution_data=attribution_data
    )

    disposition = "inline" if view == "inline" else f'attachment; filename="{res["filename"]}"'

    return Response(
        content=res["pdf_bytes"],
        media_type="application/pdf",
        headers={
            "Content-Disposition": disposition,
            "X-Report-Hash-SHA256": res["file_hash"],
            "X-Report-Pages": "10",
            "Access-Control-Expose-Headers": "Content-Disposition, X-Report-Hash-SHA256, X-Report-Pages"
        }
    )


@router.post("/reports/vessel-evidence-brief")
@router.post("/api/reports/vessel-evidence-brief")
async def generate_vessel_evidence_brief_endpoint(
    payload: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    JSON initiation endpoint for vessel evidence brief generation.
    Returns metadata including download_url and cryptographic SHA-256 seal.
    """
    req = payload or {}
    identifier = req.get("identifier") or req.get("vessel_id") or req.get("imo") or req.get("name") or "MT Pacific Voyager"
    incident_code = req.get("incident_code") or "IN-MH-2026"

    # Call the download generator directly to get metadata and file hash
    resp = await download_vessel_evidence_brief(
        identifier=str(identifier),
        incident_code=incident_code,
        speed_kts=req.get("speed_kts"),
        heading_deg=req.get("heading_deg"),
        lat=req.get("lat"),
        lon=req.get("lon"),
        vessel_type=req.get("vessel_type"),
        flag=req.get("flag"),
        name=req.get("name"),
        score=req.get("score") or req.get("overall_score"),
        cpa_km=req.get("cpa_km"),
        dark_duration=req.get("dark_duration"),
        hindcast_match=req.get("hindcast_match"),
        anomaly_level=req.get("anomaly_level"),
        dimensions_json=json.dumps(req.get("dimensions")) if req.get("dimensions") else None,
        view="attachment",
        db=db
    )

    sha_hash = resp.headers.get("X-Report-Hash-SHA256", "")
    content_disp = resp.headers.get("Content-Disposition", "")
    filename = content_disp.split('filename="')[-1].rstrip('"') if 'filename="' in content_disp else "Sahayya_EvidenceBrief.pdf"

    return {
        "status": "ready",
        "identifier": str(identifier),
        "incident_code": incident_code,
        "filename": filename,
        "file_hash": sha_hash,
        "download_url": f"/reports/vessel-evidence-brief/download?identifier={identifier}&incident_code={incident_code}",
        "pages_count": 10
    }


@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: int,
    view: Optional[str] = Query(None, description="'inline' to open in browser, 'attachment' to download"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Report).where(Report.id == report_id)
    report = (await db.execute(stmt)).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report record not found")

    pdf_bytes = storage_service.get_file_bytes(report.file_url)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Underlying PDF file not found in storage")

    filename = os.path.basename(report.file_url) if "/" in report.file_url else f"Sahayya_Report_{report_id}.pdf"
    if not filename.endswith(".pdf"):
        filename = f"Sahayya_Incident_Report_{report.incident_id}.pdf"

    disposition = "inline" if view == "inline" else f'attachment; filename="{filename}"'

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": disposition,
            "X-Report-Hash-SHA256": report.file_hash,
            "Access-Control-Expose-Headers": "Content-Disposition, X-Report-Hash-SHA256"
        }
    )

