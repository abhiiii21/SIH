import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.incident import Incident
from app.schemas.simulation import CounterfactualRequest, CounterfactualResponse
from app.services.tasks import execute_counterfactual_job, JOB_RESULTS

router = APIRouter(tags=["Counterfactual Simulation"])


@router.post("/incidents/{incident_id_or_code}/counterfactual", response_model=CounterfactualResponse)
async def trigger_counterfactual_run(
    incident_id_or_code: str,
    body: CounterfactualRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    if incident_id_or_code.isdigit():
        stmt = select(Incident).where(or_(Incident.id == int(incident_id_or_code), Incident.incident_code == incident_id_or_code))
    else:
        stmt = select(Incident).where(Incident.incident_code == incident_id_or_code)
    incident = (await db.execute(stmt)).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    job_id = f"cf-{uuid.uuid4().hex[:10]}"
    JOB_RESULTS[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "incident_id": incident.id,
        "vessel_id": body.vessel_id,
    }

    # Execute simulation in background task (immediate and reliable in all environments)
    background_tasks.add_task(
        execute_counterfactual_job,
        job_id=job_id,
        incident_id=incident.id,
        vessel_id=body.vessel_id,
        params=body.parameters
    )

    return CounterfactualResponse(
        job_id=job_id,
        status="queued",
        incident_id=incident.id,
        vessel_id=body.vessel_id,
    )


@router.get("/counterfactual-jobs/{job_id}", response_model=CounterfactualResponse)
async def get_counterfactual_job_status(job_id: str):
    if job_id not in JOB_RESULTS:
        raise HTTPException(status_code=404, detail=f"Counterfactual job '{job_id}' not found")
    
    data = JOB_RESULTS[job_id]
    return CounterfactualResponse(**data)
