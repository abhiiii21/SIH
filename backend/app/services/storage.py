import os
import io
from typing import Optional, Tuple
from minio import Minio
from minio.error import S3Error
from app.core.config import settings

LOCAL_STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "reports")
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)


class StorageService:
    def __init__(self):
        self.minio_client: Optional[Minio] = None
        self._checked_bucket = False

    def _get_client(self) -> Optional[Minio]:
        if self.minio_client is not None:
            return self.minio_client
        if self._checked_bucket:
            return None
        self._checked_bucket = True
        try:
            import urllib3
            http_client = urllib3.PoolManager(timeout=urllib3.Timeout(connect=1.0, read=2.0))
            client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
                http_client=http_client,
            )
            # Verify connectivity or create bucket
            if not client.bucket_exists(settings.MINIO_BUCKET_NAME):
                client.make_bucket(settings.MINIO_BUCKET_NAME)
            self.minio_client = client
            return self.minio_client
        except Exception:
            # Fallback to local file storage if MinIO is not running locally
            self.minio_client = None
            return None

    def upload_file(self, filename: str, data: bytes, content_type: str = "application/pdf") -> str:
        """
        Uploads file bytes to MinIO bucket if available, else stores in local filesystem.
        Returns the file URL or relative storage path.
        """
        import re
        safe_filename = re.sub(r'[^\w\.-]', '_', filename)
        client = self._get_client()
        if client:
            try:
                data_stream = io.BytesIO(data)
                client.put_object(
                    bucket_name=settings.MINIO_BUCKET_NAME,
                    object_name=safe_filename,
                    data=data_stream,
                    length=len(data),
                    content_type=content_type,
                )
                return f"minio://{settings.MINIO_BUCKET_NAME}/{safe_filename}"
            except Exception:
                pass

        # Local storage fallback
        local_path = os.path.join(LOCAL_STORAGE_DIR, safe_filename)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(data)
        return f"/storage/reports/{safe_filename}"

    def get_file_bytes(self, file_url: str) -> Optional[bytes]:
        """Fetch bytes for a given file_url."""
        client = self._get_client()
        if file_url.startswith("minio://") and client:
            try:
                parts = file_url.replace("minio://", "").split("/", 1)
                bucket = parts[0]
                object_name = parts[1]
                response = client.get_object(bucket, object_name)
                return response.read()
            except Exception:
                pass

        filename = os.path.basename(file_url)
        local_path = os.path.join(LOCAL_STORAGE_DIR, filename)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        return None


storage_service = StorageService()
