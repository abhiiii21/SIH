from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class PortOut(BaseModel):
    id: int
    name: str
    city: str
    state: str
    location: Dict[str, Any]
    port_type: str

    model_config = ConfigDict(from_attributes=True)


class CoastGuardAssetOut(BaseModel):
    id: int
    name: str
    asset_type: str
    current_location: Dict[str, Any]
    status: str

    model_config = ConfigDict(from_attributes=True)


class ResponseActionOut(BaseModel):
    id: int
    incident_id: int
    action_text: str
    status: str
    sequence_order: int
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ResponseActionUpdate(BaseModel):
    status: str


class PriorityZoneOut(BaseModel):
    id: int
    incident_id: int
    zone_geometry: Dict[str, Any]
    priority_rank: int
    reasoning: str

    model_config = ConfigDict(from_attributes=True)


class RecoveryRecordOut(BaseModel):
    id: int
    incident_id: int
    cleanup_progress_pct: float
    milestone: str
    water_quality_index: float
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportOut(BaseModel):
    id: int
    incident_id: int
    report_type: str
    file_url: str
    file_hash: str
    generated_at: datetime
    generated_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ReportGenerateRequest(BaseModel):
    report_type: str = "INCIDENT_DOSSIER"
