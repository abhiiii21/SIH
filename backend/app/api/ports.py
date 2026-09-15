from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.environmental import Port
from app.schemas.response import PortOut

router = APIRouter(tags=["Ports"])


@router.get("/ports", response_model=List[PortOut])
async def list_ports(db: AsyncSession = Depends(get_db)):
    stmt = select(Port).order_by(Port.name.asc())
    ports = (await db.execute(stmt)).scalars().all()
    return ports
