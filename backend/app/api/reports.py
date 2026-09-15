import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.incident import Incident
from app.models.response import Report
from app.schemas.response import ReportGenerateRequest
from app.services.tasks import execute_report_job, execute_fleet_report_job, JOB_RESULTS
from app.services.storage import storage_service

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
