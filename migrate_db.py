from sqlmodel import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql"))

def migrate():
    print("Migrating Database...")
    with engine.connect() as conn:
        try:
            # Drop constraint/column if it was vector for clean slate?
            # Or just add column if not exists.
            print("Adding embedding column to storycut...")
            conn.execute(text("ALTER TABLE storycut ADD COLUMN IF NOT EXISTS embedding JSON;"))
            
            print("Adding new columns to project table...")
            conn.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS subtitle VARCHAR;"))
            conn.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS genre VARCHAR;"))
            conn.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS worldview TEXT;"))
            
            # Also for project template if needed
            print("Ensuring projecttemplate table exists (handled by main.py startup)...")
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
