from sqlmodel import create_engine, text
from app.core.config import settings
import os

# Use the same connection string logic as migrate_db.py
db_url = settings.DATABASE_URL
if db_url and "postgresql+asyncpg" in db_url:
    db_url = db_url.replace("postgresql+asyncpg", "postgresql")

engine = create_engine(db_url)

def migrate():
    print("Adding style_reference_url to project table...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS style_reference_url VARCHAR;"))
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
