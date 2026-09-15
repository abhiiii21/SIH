from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from app.core.database import Base, GeoJSONType


class EnvironmentalReading(Base):
    __tablename__ = "environmental_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    location = Column(GeoJSONType, nullable=False)  # GEOMETRY(Point, 4326)
    wind_speed_ms = Column(Float, nullable=False)
    wind_direction_deg = Column(Float, nullable=False)
    current_speed_ms = Column(Float, nullable=False)
    current_direction_deg = Column(Float, nullable=False)
    wave_height_m = Column(Float, nullable=False)
    sst_c = Column(Float, nullable=False)  # Sea Surface Temperature in °C
    recorded_at = Column(DateTime, nullable=False, index=True)


class Port(Base):
    __tablename__ = "ports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), unique=True, index=True, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    location = Column(GeoJSONType, nullable=False)  # GEOMETRY(Point, 4326)
    port_type = Column(String(50), default="Major Port", nullable=False)


class CoastGuardAsset(Base):
    __tablename__ = "coast_guard_assets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    asset_type = Column(String(50), nullable=False)  # offshore_patrol_vessel, fast_patrol_vessel, interceptor_boat, patrol_aircraft
    current_location = Column(GeoJSONType, nullable=False)  # GEOMETRY(Point, 4326)
    status = Column(String(50), default="operational", nullable=False)  # operational, on_mission, maintenance
