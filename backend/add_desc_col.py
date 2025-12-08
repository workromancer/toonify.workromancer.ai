from sqlmodel import Session, text
from app.api.deps import engine

def fix_db():
    print("Adding description column to Character table...")
    with Session(engine) as session:
        try:
            session.exec(text("ALTER TABLE character ADD COLUMN IF NOT EXISTS description text;"))
            session.commit()
            print("Column added.")
        except Exception as e:
            print(f"Error adding column: {e}")
            
        # Optional: Reset alembic version to avoid future conflicts if we want to restart migrations
        # session.exec(text("DELETE FROM alembic_version;"))
        # session.exec(text("INSERT INTO alembic_version (version_num) VALUES ('fe47e76d6e9d');"))
        # session.commit()

if __name__ == "__main__":
    fix_db()
