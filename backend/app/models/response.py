from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base, GeoJSONType


class ResponseAction(Base):
    __tablename__ = "response_actions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    action_text = Column(String(500), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, completed
    sequence_order = Column(Integer, default=1, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    incident = relationship("Incident", back_populates="response_actions")


class PriorityZone(Base):
    __tablename__ = "priority_zones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_geometry = Column(GeoJSONType, nullable=False)  # GEOMETRY(Polygon, 4326)
    priority_rank = Column(Integer, default=1, nullable=False)
    reasoning = Column(Text, nullable=False)

    incident = relationship("Incident", back_populates="priority_zones")


class RecoveryRecord(Base):
    __tablename__ = "recovery_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    cleanup_progress_pct = Column(Float, nullable=False)
    milestone = Column(String(100), nullable=False)  # containment_deployed, skimming_active, shoreline_cleanup, site_remediated
    water_quality_index = Column(Float, nullable=False)  # e.g., 0-100 scale
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    incident = relationship("Incident", back_populates="recovery_records")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(100), default="INCIDENT_DOSSIER", nullable=False)  # INCIDENT_DOSSIER, FORENSIC_SUMMARY, EVIDENCE_PACKAGE
    file_url = Column(String(500), nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256 digest
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    incident = relationship("Incident", back_populates="reports")
