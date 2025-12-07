from sqlmodel import Session, select
from app.api.deps import engine
from app.models.models import StoryCut, Episode
import base64

def seed_cut():
    with Session(engine) as session:
        # Find the episode we created
        episode = session.exec(select(Episode).where(Episode.title == "Final Verified Episode")).first()
        if not episode:
            print("Episode not found, creating one...")
            # Fallback if previous step failed or DB reset
            return

        print(f"Seeding cut for episode: {episode.id}")
        
        # Create a tiny 1x1 red pixel or something simple as base64
        # Red 1x1 png base64
        red_pixel_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        image_data = f"data:image/png;base64,{red_pixel_b64}"

        cut = StoryCut(
            episode_id=episode.id,
            cut_order=1,
            script="A red scene",
            image_path=image_data,
            aspect_ratio="1:1",
            selected_layout="default" # Fix NotNullViolation
        )
        session.add(cut)
        session.commit()
        print("Seeded cut successfully.")

if __name__ == "__main__":
    seed_cut()
