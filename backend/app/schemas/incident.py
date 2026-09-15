from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class SpillGeometryOut(BaseModel):
    id: int
    incident_id: int
    geometry: Dict[str, Any]
    captured_at: datetime
    source: str
    confidence_score: float

    model_config = ConfigDict(from_attributes=True)


class SpillDNAOut(BaseModel):
    id: int
    incident_id: int
    area_km2: float
    perimeter_km: float
    length_major_km: float
    width_minor_km: float
    orientation_deg: float
    shape_index: float
    fragmentation: float
    thickness_min_mm: float
    thickness_max_mm: float
    volume_min_m3: float
    volume_max_m3: float

    model_config = ConfigDict(from_attributes=True)


class OriginZoneOut(BaseModel):
    id: int
    incident_id: int
    zone_geometry: Dict[str, Any]
    center_point: Dict[str, Any]
    release_window_start: datetime
    release_window_end: datetime
    confidence_pct: float
    model_used: str

    model_config = ConfigDict(from_attributes=True)


class ForecastSnapshotOut(BaseModel):
    id: int
    incident_id: int
    forecast_geometry: Dict[str, Any]
    forecast_for_time: datetime
    generated_at: datetime
    model_version: str

    model_config = ConfigDict(from_attributes=True)


class ImpactAssessmentOut(BaseModel):
    id: int
    incident_id: int
    coastline_distance_km: float
    coastline_region: str
    eta_hours: float
    mpa_overlap_pct: float
    mpa_overlap_km2: float
    fishing_zone_overlap_pct: float
    fishing_zone_overlap_km2: float
    risk_level: str

    model_config = ConfigDict(from_attributes=True)


class ActivityLogOut(BaseModel):
    id: int
    incident_id: int
    event_text: str
    status: str
    occurred_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentBase(BaseModel):
    incident_code: str
    title: str
    status: str
    severity_score: float
    spill_area_km2: float
    detected_at: datetime
    location: Dict[str, Any]
    region_name: str
    description: Optional[str] = None
    detection_source: str = "Sentinel-1A SAR"
    investigating_agency: str = "Indian Coast Guard"


class IncidentCreate(IncidentBase):
    pass


class IncidentStatusUpdate(BaseModel):
    status: str


class IncidentNoteCreate(BaseModel):
    note: str


class IncidentOut(IncidentBase):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentDetailOut(IncidentOut):
    spill_dna: Optional[SpillDNAOut] = None
    origin_zone: Optional[OriginZoneOut] = None
    impact_assessment: Optional[ImpactAssessmentOut] = None
    spill_geometries: List[SpillGeometryOut] = []
    activity_logs: List[ActivityLogOut] = []

    model_config = ConfigDict(from_attributes=True)
