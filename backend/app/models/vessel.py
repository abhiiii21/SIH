from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, GeoJSONType


class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    imo_number = Column(String(20), unique=True, index=True, nullable=True)
    mmsi = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    vessel_type = Column(String(50), default="tanker", index=True, nullable=False)  # tanker, bulk_carrier, container, general_cargo, other
    flag_country = Column(String(100), default="India", nullable=False)
    built_year = Column(Integer, nullable=True)

    # Relationships
    positions = relationship("VesselPosition", back_populates="vessel", cascade="all, delete-orphan")
    attributions = relationship("VesselAttribution", back_populates="vessel", cascade="all, delete-orphan")
    asi_events = relationship("ASIEvent", back_populates="vessel", cascade="all, delete-orphan")
    counterfactual_runs = relationship("CounterfactualRun", back_populates="vessel", cascade="all, delete-orphan")


class VesselPosition(Base):
    __tablename__ = "vessel_positions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vessel_id = Column(Integer, ForeignKey("vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(GeoJSONType, nullable=False)  # GEOMETRY(Point, 4326)
    speed_kts = Column(Float, default=0.0, nullable=False)
    heading_deg = Column(Float, default=0.0, nullable=False)
    recorded_at = Column(DateTime, nullable=False, index=True)
    source = Column(String(50), default="AIS_TERRESTRIAL", nullable=False)

    vessel = relationship("Vessel", back_populates="positions")


class VesselAttribution(Base):
    __tablename__ = "vessel_attributions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    vessel_id = Column(Integer, ForeignKey("vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    rank = Column(Integer, default=1, nullable=False)
    attribution_pct = Column(Float, nullable=False)
    cpa_km = Column(Float, nullable=False)  # Closest Point of Approach
    min_sog_kts = Column(Float, nullable=False)
    ais_gap_minutes = Column(Integer, default=0, nullable=False)
    time_match_pct = Column(Float, nullable=False)
    location_match_pct = Column(Float, nullable=False)
    route_match_pct = Column(Float, nullable=False)
    ais_consistency_pct = Column(Float, nullable=False)
    physics_match_pct = Column(Float, nullable=False)
    overall_evidence_pct = Column(Float, nullable=False)
    verdict = Column(String(50), default="consistent", nullable=False)  # highly_consistent, consistent, inconsistent

    incident = relationship("Incident", back_populates="vessel_attributions")
    vessel = relationship("Vessel", back_populates="attributions")


class CounterfactualRun(Base):
    __tablename__ = "counterfactual_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    vessel_id = Column(Integer, ForeignKey("vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    simulated_geometry = Column(GeoJSONType, nullable=False)  # GEOMETRY(Polygon, 4326)
    match_score_pct = Column(Float, nullable=False)
    run_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    parameters = Column(GeoJSONType, nullable=True)  # JSONB dictionary of simulation parameters

    incident = relationship("Incident", back_populates="counterfactual_runs")
    vessel = relationship("Vessel", back_populates="counterfactual_runs")


class ASIEvent(Base):
    __tablename__ = "asi_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vessel_id = Column(Integer, ForeignKey("vessels.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False)  # irregular_movement, identity_anomaly, prolonged_loitering, dark_activity
    severity = Column(String(20), default="medium", nullable=False)  # low, medium, high
    description = Column(String(500), nullable=False)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    vessel = relationship("Vessel", back_populates="asi_events")
