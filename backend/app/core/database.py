import json
from typing import AsyncGenerator, Any
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.types import TypeDecorator, TEXT
from app.core.config import settings

# Determine dialect and connect args
connect_args = {}
database_url = settings.DATABASE_URL

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    database_url,
    echo=False,
    connect_args=connect_args,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


class GeoJSONType(TypeDecorator):
    """
    Unified GeoJSON spatial storage type.
    In SQLite/Postgres, stores GeoJSON text and automatically deserializes
    to Python dicts (e.g., {"type": "Point", "coordinates": [lng, lat]} or
    {"type": "Polygon", "coordinates": [...]}).
    Guarantees seamless serialization to Pydantic and React-Leaflet.
    """
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, (dict, list)):
            return json.dumps(value)
        return str(value)

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return value
        return value


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
