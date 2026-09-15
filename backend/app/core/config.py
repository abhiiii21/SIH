from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Sahayya Maritime Intelligence & Vessel Attribution API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = ""

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./sahayya_dev.db"

    # Redis & Background Workers
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO / Object Storage
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "sahayya_minio_admin"
    MINIO_SECRET_KEY: str = "sahayya_minio_secret_2026"
    MINIO_BUCKET_NAME: str = "sahayya-reports"
    MINIO_SECURE: bool = False

    # Security & JWT
    SECRET_KEY: str = "sahayya_maritime_defense_jwt_secret_key_2026_india"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000"

    # Local / Cloud Ollama AI Intelligence Layer
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3"
    OLLAMA_API_KEY: str = ""
    OLLAMA_TIMEOUT: float = 30.0

    # Google Gemini AI Cloud Intelligence Layer
    GOOGLE_API_KEY: str = ""
    GOOGLE_AP_KEY: str = ""  # Support typo variant entered in .env
    GEMINI_MODEL: str = "gemini-3.5-flash"

    @property
    def active_google_key(self) -> str:
        return (self.GOOGLE_API_KEY or self.GOOGLE_AP_KEY or "").strip()

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
