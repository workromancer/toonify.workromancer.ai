import io
import os
from abc import ABC, abstractmethod
from minio import Minio
from minio.error import S3Error
from app.core.config import settings
import uuid

class StorageService(ABC):
    @abstractmethod
    def upload_image(self, image_data: bytes, content_type: str = "image/png") -> str:
        pass

class MinIOStorage(StorageService):
    def __init__(self):
        # Initialize MinIO client
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                # Set public policy for read access (simplified for MVP)
                policy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}' % self.bucket_name
                self.client.set_bucket_policy(self.bucket_name, policy)
        except S3Error as e:
            print(f"Error checking/creating bucket: {e}")

    def upload_image(self, image_data: bytes, content_type: str = "image/png") -> str:
        filename = f"{uuid.uuid4()}.png"
        try:
            self.client.put_object(
                self.bucket_name,
                filename,
                io.BytesIO(image_data),
                len(image_data),
                content_type=content_type
            )
            # Use settings for base URL if constructed, else default behavior
            base_url = f"http://{settings.MINIO_ENDPOINT}"
            if not settings.MINIO_SECURE:
                url = f"{base_url}/{self.bucket_name}/{filename}"
            else:
                url = f"https://{settings.MINIO_ENDPOINT}/{self.bucket_name}/{filename}"
            return url
        except S3Error as e:
            print(f"Error uploading file: {e}")
            raise e

class GCSStorage(StorageService):
    def __init__(self):
        from google.cloud import storage
        self.client = storage.Client()
        # Default bucket from env or settings if added, currently assuming env GCS_BUCKET_NAME
        self.bucket_name = os.getenv("GCS_BUCKET_NAME", "toonify-assets")
        self.bucket = self.client.bucket(self.bucket_name)

    def upload_image(self, image_data: bytes, content_type: str = "image/png") -> str:
        filename = f"{uuid.uuid4()}.png"
        blob = self.bucket.blob(filename)
        blob.upload_from_string(image_data, content_type=content_type)
        # Assuming bucket is public or we use signed URLs (public for now based on MinIO logic)
        # Note: Bucket must be configured to be public readable
        return blob.public_url

def get_storage_service() -> StorageService:
    env = os.getenv("APP_ENV", "local")
    if env == "production":
        return GCSStorage()
    return MinIOStorage()

storage = get_storage_service()
