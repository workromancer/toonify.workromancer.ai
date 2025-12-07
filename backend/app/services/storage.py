import io
from minio import Minio
from minio.error import S3Error
from app.core.config import settings
import uuid

class StorageService:
    def __init__(self):
        # Initialize MinIO client
        # Note: In docker-compose, hostname is 'minio', but from host it's 'localhost'.
        # Assuming backend runs locally (not in docker), we use localhost settings.
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
        """
        Uploads bytes to MinIO and returns the public URL.
        """
        filename = f"{uuid.uuid4()}.png"
        try:
            result = self.client.put_object(
                self.bucket_name,
                filename,
                io.BytesIO(image_data),
                len(image_data),
                content_type=content_type
            )
            # Return URL. For local dev, we might need a way to reach this.
            # If using MinIO Console on 9001 and API on 9000.
            # Accessing from browser: http://localhost:9000/bucket/filename
            
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

storage = StorageService()
