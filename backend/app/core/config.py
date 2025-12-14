from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings
import os
import sys

class Settings(BaseSettings):
    PROJECT_NAME: str
    API_V1_STR: str
    DEBUG: bool
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = []
    SECRET_KEY: str

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str | None = None

    @validator("DATABASE_URL", pre=True)
    def assemble_db_connection(cls, v: str | None, values: dict[str, any]) -> str:
        if isinstance(v, str):
            return v
        return str(
            f"postgresql+asyncpg://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@"
            f"{values.get('POSTGRES_SERVER')}/{values.get('POSTGRES_DB')}"
        )

    # MinIO
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str
    MINIO_SECURE: bool = False

    # AI
    GEMINI_API_KEY: str
    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str

    class Config:
        case_sensitive = True
        env_file = ".env.local"

# Enforce .env.local existence
if not os.path.exists(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.local")):
    print("CRITICAL ERROR: .env.local file is missing in backend directory.")
    print("Please create .env.local (you can copy .env.example) and set the required variables.")
    sys.exit(1)

settings = Settings()
