from sqlmodel import Session, text
from app.api.deps import engine

def fix():
    try:
        with Session(engine) as session:
            # Check current type (optional, but let's just force alter)
            print("Altering storycut table...")
            session.exec(text("ALTER TABLE storycut ALTER COLUMN image_path TYPE text;"))
            session.commit()
            print("Table altered successfully.")
    except Exception as e:
        print(f"Fix failed: {e}")

if __name__ == "__main__":
    fix()
