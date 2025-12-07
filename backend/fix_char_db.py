from sqlmodel import Session, text
from app.api.deps import engine

def fix_db():
    print("Altering verify Character.profile_image_url type...")
    with Session(engine) as session:
        # Alter column type to TEXT to support base64 images
        session.exec(text("ALTER TABLE character ALTER COLUMN profile_image_url TYPE text;"))
        session.commit()
    print("Database schema updated successfully.")

if __name__ == "__main__":
    fix_db()
