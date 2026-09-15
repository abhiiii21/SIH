from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="coast_guard", nullable=False)  # coast_guard, port_authority, environmental_regulator, researcher, ngo, other
    organization = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
