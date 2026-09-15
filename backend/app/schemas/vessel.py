from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class VesselPositionOut(BaseModel):
    id: int
    vessel_id: int
    position: Dict[str, Any]
    speed_kts: float
    heading_deg: float
    recorded_at: datetime
    source: str

    model_config = ConfigDict(from_attributes=True)


class ASIEventOut(BaseModel):
    id: int
    vessel_id: int
    incident_id: Optional[int] = None
    event_type: str
    severity: str
    description: str
    occurred_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VesselBase(BaseModel):
    imo_number: Optional[str] = None
    mmsi: str
    name: str
    vessel_type: str
    flag_country: str
    built_year: Optional[int] = None


class VesselOut(VesselBase):
    id: int
    latest_position: Optional[Dict[str, Any]] = None
    speed_kts: Optional[float] = 0.0
    heading_deg: Optional[float] = 0.0
    asi_events: List[ASIEventOut] = []

    model_config = ConfigDict(from_attributes=True)


class VesselAttributionOut(BaseModel):
    id: int
    incident_id: int
    vessel_id: int
    rank: int
    attribution_pct: float
    cpa_km: float
    min_sog_kts: float
    ais_gap_minutes: int
    time_match_pct: float
    location_match_pct: float
    route_match_pct: float
    ais_consistency_pct: float
    physics_match_pct: float
    overall_evidence_pct: float
    verdict: str
    vessel: Optional[VesselOut] = None

    model_config = ConfigDict(from_attributes=True)


class AttributionEvidenceOut(BaseModel):
    attribution: VesselAttributionOut
    breakdown: Dict[str, Any]
    timeline_events: List[Dict[str, Any]]


class EvidenceDimensionOut(BaseModel):
    name: str
    shortName: str
    score: float
    desc: str
    color: str


class VesselEvidenceVerdictOut(BaseModel):
    text: str
    level: str
    color: str


class VesselEvidenceOut(BaseModel):
    vessel_id: int
    name: str
    imo: Optional[str] = None
    mmsi: str
    vessel_type: str
    flag: str
    overall_score: float
    verdict: VesselEvidenceVerdictOut
    hindcast_match: str
    anomaly_level: str
    dark_duration: str
    dimensions: List[EvidenceDimensionOut]
    timeline_events: List[Dict[str, Any]]
