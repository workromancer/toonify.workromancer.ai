from sqlmodel import Session, select
from app.api.deps import engine
from app.models.models import StoryCut
from uuid import UUID

from app.models.models import StoryCut, Episode, Project
from uuid import UUID

def create_cut():
    project_id = UUID("0e85ef8f-355b-4baf-9524-71fd414b2f5a")
    
    with Session(engine) as session:
        # 1. Ensure Project Exists
        project = session.get(Project, project_id)
        if not project:
            print(f"Project {project_id} not found. Picking first available project.")
            project = session.exec(select(Project)).first()
            if not project:
                print("No projects found. Cannot proceed.")
                return
            print(f"Using Project: {project.id} ({project.title})")
        
        # 2. Ensure Episode Exists
        episode = session.exec(select(Episode).where(Episode.project_id == project.id)).first()
        if not episode:
            print("Creating new episode...")
            episode = Episode(
                project_id=project.id,
                title="Debug Episode",
                episode_order=1,
                story_summary="Created for debugging."
            )
            session.add(episode)
            session.commit()
            session.refresh(episode)
        
        print(f"Using Episode: {episode.id}")

        # 3. Create Cut
        cut = StoryCut(
            episode_id=episode.id,
            cut_order=1,
            script="A test scene for debugging generate all.",
            selected_layout="single",
            aspect_ratio="1:1",
            dialogues=[],
            image_path=None
        )
        session.add(cut)
        session.commit()
        session.refresh(cut)
        print(f"Created test cut: {cut.id}")
        
        url = f"http://localhost:3000/project/{project.id}/editor?episode_id={episode.id}"
        print(f"NAVIGATE TO: {url}")

if __name__ == "__main__":
    create_cut()
