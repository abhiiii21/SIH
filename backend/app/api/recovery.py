from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.incident import Incident
from app.models.response import RecoveryRecord
from app.schemas.response import RecoveryRecordOut

router = APIRouter(tags=["Recovery & Restoration"])


@router.get("/incidents/{incident_id_or_code}/recovery", response_model=List[RecoveryRecordOut])
async def get_incident_recovery(incident_id_or_code: str, db: AsyncSession = Depends(get_db)):
    if incident_id_or_code.isdigit():
        stmt = select(Incident).where(or_(Incident.id == int(incident_id_or_code), Incident.incident_code == incident_id_or_code))
    else:
        stmt = select(Incident).where(Incident.incident_code == incident_id_or_code)
    incident = (await db.execute(stmt)).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    rec_stmt = select(RecoveryRecord).where(RecoveryRecord.incident_id == incident.id).order_by(RecoveryRecord.recorded_at.asc())
    records = (await db.execute(rec_stmt)).scalars().all()
    return records
