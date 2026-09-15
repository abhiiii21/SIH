from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class CounterfactualRequest(BaseModel):
    vessel_id: int
    parameters: Optional[Dict[str, Any]] = None


class CounterfactualResponse(BaseModel):
    job_id: str
    status: str  # queued, processing, completed, failed
    incident_id: int
    vessel_id: int
    match_score_pct: Optional[float] = None
    simulated_geometry: Optional[Dict[str, Any]] = None
    run_at: Optional[datetime] = None
    parameters: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class ForecastResponse(BaseModel):
    incident_id: int
    hours: int
    generated_at: datetime
    snapshots: List[Dict[str, Any]]
