from typing import Generator
from sqlmodel import Session, create_engine
from app.core.config import settings

# Sync engine for simpler dependency injection in standard endpoints
# Async is better for high load, but SQLModel + Async requires more boilerplate.
# For MVP, let's use Sync Session with `yield` for endpoints.
# Wait, I installed asyncpg, maybe I should use AsyncSession?
# Let's stick to SYNC engine for simplicity unless user asked for async specifically?
# The requirements had asyncpg. Let's try AsyncSession if possible, or fallback to sync with psycopg2.
# User didn't specify. I'll use Sync with psycopg2-binary for simplicity and speed of dev.
# (I installed psycopg2-binary already).

engine = create_engine(settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql"), echo=True)

def get_session():
    with Session(engine) as session:
        yield session
