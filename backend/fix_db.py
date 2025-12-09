from sqlmodel import Session, text, create_engine
from app.core.config import settings

# Force sync engine for migration script
sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
engine = create_engine(sync_url)

def fix():
    try:
        with Session(engine) as session:
            print("Altering project table...")
            # Alter worldview to JSON (using casting if there's existing text data)
            session.exec(text("ALTER TABLE project ALTER COLUMN worldview TYPE JSON USING worldview::JSON;"))
            session.commit()
            print("Table altered successfully.")
    except Exception as e:
        print(f"Fix failed: {e}")

if __name__ == "__main__":
    fix()
