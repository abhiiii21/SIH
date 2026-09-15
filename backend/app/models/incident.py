from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, GeoJSONType


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="detection", index=True, nullable=False)  # detection, analysis, attribution, response_planning, closed
    severity_score = Column(Float, default=5.0, nullable=False)
    spill_area_km2 = Column(Float, default=0.0, nullable=False)
    detected_at = Column(DateTime, nullable=False)
    location = Column(GeoJSONType, nullable=False)  # GEOMETRY(Point, 4326)
    region_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    detection_source = Column(String(100), default="Sentinel-1A SAR", nullable=False)
    investigating_agency = Column(String(150), default="Indian Coast Guard", nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    spill_geometries = relationship("SpillGeometry", back_populates="incident", cascade="all, delete-orphan")
    spill_dna = relationship("SpillDNA", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    origin_zone = relationship("OriginZone", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    forecast_snapshots = relationship("ForecastSnapshot", back_populates="incident", cascade="all, delete-orphan")
    impact_assessment = relationship("ImpactAssessment", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="incident", cascade="all, delete-orphan")
    vessel_attributions = relationship("VesselAttribution", back_populates="incident", cascade="all, delete-orphan")
    counterfactual_runs = relationship("CounterfactualRun", back_populates="incident", cascade="all, delete-orphan")
    response_actions = relationship("ResponseAction", back_populates="incident", cascade="all, delete-orphan")
    priority_zones = relationship("PriorityZone", back_populates="incident", cascade="all, delete-orphan")
    recovery_records = relationship("RecoveryRecord", back_populates="incident", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="incident", cascade="all, delete-orphan")


class SpillGeometry(Base):
    __tablename__ = "spill_geometries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    geometry = Column(GeoJSONType, nullable=False)  # GEOMETRY(Polygon, 4326)
    captured_at = Column(DateTime, nullable=False)
    source = Column(String(100), default="Sentinel-1A SAR", nullable=False)
    confidence_score = Column(Float, default=0.95, nullable=False)

    incident = relationship("Incident", back_populates="spill_geometries")


class SpillDNA(Base):
    __tablename__ = "spill_dna"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    area_km2 = Column(Float, nullable=False)
    perimeter_km = Column(Float, nullable=False)
    length_major_km = Column(Float, nullable=False)
    width_minor_km = Column(Float, nullable=False)
    orientation_deg = Column(Float, nullable=False)
    shape_index = Column(Float, nullable=False)
    fragmentation = Column(Float, nullable=False)
    thickness_min_mm = Column(Float, nullable=False)
    thickness_max_mm = Column(Float, nullable=False)
    volume_min_m3 = Column(Float, nullable=False)
    volume_max_m3 = Column(Float, nullable=False)

    incident = relationship("Incident", back_populates="spill_dna")


class OriginZone(Base):
    __tablename__ = "origin_zones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    zone_geometry = Column(GeoJSONType, nullable=False)  # GEOMETRY(Polygon, 4326)
    center_point = Column(GeoJSONType, nullable=False)   # GEOMETRY(Point, 4326)
    release_window_start = Column(DateTime, nullable=False)
    release_window_end = Column(DateTime, nullable=False)
    confidence_pct = Column(Float, nullable=False)
    model_used = Column(String(100), default="OpenDrift Hindcast", nullable=False)

    incident = relationship("Incident", back_populates="origin_zone")


class ForecastSnapshot(Base):
    __tablename__ = "forecast_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_geometry = Column(GeoJSONType, nullable=False)  # GEOMETRY(Polygon, 4326)
    forecast_for_time = Column(DateTime, nullable=False)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    model_version = Column(String(50), default="v2.1-lagrangian", nullable=False)

    incident = relationship("Incident", back_populates="forecast_snapshots")


class ImpactAssessment(Base):
    __tablename__ = "impact_assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    coastline_distance_km = Column(Float, nullable=False)
    coastline_region = Column(String(150), nullable=False)
    eta_hours = Column(Float, nullable=False)
    mpa_overlap_pct = Column(Float, nullable=False)
    mpa_overlap_km2 = Column(Float, nullable=False)
    fishing_zone_overlap_pct = Column(Float, nullable=False)
    fishing_zone_overlap_km2 = Column(Float, nullable=False)
    risk_level = Column(String(20), default="HIGH", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW

    incident = relationship("Incident", back_populates="impact_assessment")


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    event_text = Column(String(500), nullable=False)
    status = Column(String(50), default="done", nullable=False)  # done, pending, in_progress
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="activity_logs")
