from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from app.api.deps import get_session
from app.models.models import Project, ProjectTemplate, User, Character, StoryCut, Episode
from app.services.ai import ai_service
from app.services.storage import storage
import uuid
import base64
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

# --- Request Models ---

class StyleUpdateRequest(BaseModel):
    art_style: str

class CastingInitRequest(BaseModel):
    initial_character_name: str = "New Character"

class TextAugmentRequest(BaseModel):
    name: str
    tags: List[str]
    mood: str
    style: str

class GenerateSheetRequest(BaseModel):
    character_id: uuid.UUID
    name: str
    description: str
    style: str

class GenerateIdeaRequest(BaseModel):
    project_id: uuid.UUID

class CreateEpisodeRequest(BaseModel):
    project_id: uuid.UUID
    title: str
    summary: str
    num_cuts: int = 6

class GenerateCutImageRequest(BaseModel):
    cut_id: uuid.UUID


# --- Background Tasks ---

async def bg_generate_cover(project_id: uuid.UUID, style: str, session_factory):
    """
    Background task to generate project cover.
    """
    # Create a fresh session for the background task
    from sqlmodel import Session
    from app.api.deps import engine 
    # Use engine directly or pass session factory. 
    # Better to import engine from deps if accessible, or pass it.
    
    # Re-importing engine here to avoid circular dependencies if any, 
    # but practically we should pass the session or engine.
    # For now, let's assume we can get engine or use the passed session if it's thread-safe (Sessions aren't).
    
    # We will just instantiate a new session from the global engine for the bg task.
    # This assumes 'engine' is available globally or we can import it.
    from app.api.deps import engine

    with Session(engine) as session:
        project = session.get(Project, project_id)
        if not project:
            return

        try:
            print(f"Starting Cover Generation for {project_id}...")
            # 1. Generate Image
            # Construct worldview text from dict if needed or just use raw
            worldview_text = str(project.worldview) if project.worldview else ""
            
            image_bytes = ai_service.generate_project_cover_image(
                title=project.title,
                genre=project.genre or "General",
                worldview=worldview_text,
                style=style
            )
            
            
            # 2. Upload/Save Image
            try:
                data_url = storage.upload_image(image_bytes)
            except Exception as s3_e:
                print(f"Storage upload failed, using Data URL fallback: {s3_e}")
                b64_img = base64.b64encode(image_bytes).decode('utf-8')
                data_url = f"data:image/png;base64,{b64_img}"

            
            # 3. Update Project
            project.cover_image_url = data_url
            project.cover_image_status = "completed"
            session.add(project)
            session.commit()
            print(f"Cover Generation Completed for {project_id}")
            
        except Exception as e:
            print(f"Cover Generation Failed: {e}")
            project.cover_image_status = "failed"
            session.add(project)
            session.commit()

async def bg_generate_character_sheet(character_id: uuid.UUID, name: str, desc: str, style: str):
    from app.api.deps import engine
    from sqlmodel import Session
    
    with Session(engine) as session:
        char = session.get(Character, character_id)
        if not char:
            return
            
        try:
            print(f"Starting Character Sheet for {character_id}...")
            
            # 1. Generate Image
            image_bytes = ai_service.generate_character_sheet(name, desc, style)
            
            try:
                data_url = storage.upload_image(image_bytes)
            except Exception as s3_e:
                 print(f"Storage upload failed, using Data URL fallback: {s3_e}")
                 b64_img = base64.b64encode(image_bytes).decode('utf-8')
                 data_url = f"data:image/png;base64,{b64_img}"

            
            # 2. Generate Embedding
            # Combine name, desc, style, tags (if fetched) for better RAG context
            embedding_text = f"Name: {name}\nStyle: {style}\nDescription: {desc}"
            embedding_vector = ai_service.get_embedding(embedding_text)
            
            char.character_sheet_url = data_url
            char.sheet_status = "completed"
            char.embedding = embedding_vector
            session.add(char)
            session.commit()
            print(f"Sheet & Embedding Generation Completed for {character_id}")

            
        except Exception as e:
             print(f"Sheet Generation Failed: {e}")
             char.sheet_status = "failed"
             session.add(char)
             session.commit()



async def bg_generate_cut_image(cut_id: uuid.UUID):
    from app.api.deps import engine
    from sqlmodel import Session
    
    with Session(engine) as session:
        cut = session.get(StoryCut, cut_id)
        if not cut:
            return
            
        try:
            print(f"Starting Cut Image for {cut_id}...")
            # Ideally we context from the project style/chars, but simplicity for now:
            episode = session.get(Episode, cut.episode_id)
            project = session.get(Project, episode.project_id)
            
            prompt = f"{cut.script}, Style: {project.art_style or project.style_preset}"
            
            image_bytes = ai_service.generate_image(prompt, width=1024, height=1024) 
            
            try:
                data_url = storage.upload_image(image_bytes)
            except Exception as s3_e:
                print(f"Storage upload failed, using Data URL fallback: {s3_e}")
                b64_img = base64.b64encode(image_bytes).decode('utf-8')
                data_url = f"data:image/png;base64,{b64_img}"

            
            cut.image_path = data_url
            # Add embedding for the script if not present (or maybe do it on creation)
            if not cut.embedding and cut.script:
                 cut.embedding = ai_service.get_embedding(cut.script)

            session.add(cut)
            session.commit()
            print(f"Cut Image Completed for {cut_id}")
            
        except Exception as e:
             print(f"Cut Image Failed: {e}")


# --- Endpoints ---

@router.post("/projects/{project_id}/art-style")
def set_project_art_style(
    project_id: uuid.UUID, 
    request: StyleUpdateRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Update style
    project.art_style = request.art_style
    project.cover_image_status = "processing"
    session.add(project)
    session.commit()
    session.refresh(project)
    
    # Trigger Async Task
    background_tasks.add_task(bg_generate_cover, project.id, request.art_style, None)
    
    return project

@router.post("/projects/{project_id}/characters/casting/augment")
def augment_character_concept(
    project_id: uuid.UUID,
    request: TextAugmentRequest,
    session: Session = Depends(get_session)
):
    # Just a stateless AI call, no DB update needed yet
    result = ai_service.augment_character_text(
        name=request.name,
        tags=request.tags,
        mood=request.mood,
        style=request.style
    )
    return result

@router.post("/projects/{project_id}/characters/casting/generate")
def generate_character_sheet_endpoint(
    project_id: uuid.UUID,
    request: GenerateSheetRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    # Ensure character exists
    char = session.get(Character, request.character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
        
    char.sheet_status = "processing"
    # Update description to match what we are generating
    char.description = request.description
    session.add(char)
    session.commit()
    
    background_tasks.add_task(bg_generate_character_sheet, char.id, request.name, request.description, request.style)
    
    return {"status": "processing", "character_id": char.id}

@router.post("/projects/{project_id}/episodes/ideas")
def generate_episode_ideas_endpoint(
    project_id: uuid.UUID,
    session: Session = Depends(get_session)
):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Get recent episodes context
    recent_eps = session.exec(select(Episode).where(Episode.project_id == project_id).order_by(Episode.episode_order.desc()).limit(3)).all()
    recent_context = "\n".join([f"{ep.title}: {ep.story_summary}" for ep in recent_eps])
    
    ideas = ai_service.generate_episode_ideas(
        project_title=project.title,
        worldview=str(project.worldview) if project.worldview else "",
        recent_episodes=recent_context
    )
    return ideas

@router.post("/projects/{project_id}/episodes/create")
def create_episode_with_cuts(
    project_id: uuid.UUID,
    request: CreateEpisodeRequest,
    session: Session = Depends(get_session)
):
    # 1. Create Episode
    # Get max order
    existing_count = session.exec(select(Episode).where(Episode.project_id == project_id)).all()
    new_order = len(existing_count) + 1
    
    episode = Episode(
        project_id=project_id,
        title=request.title,
        story_summary=request.summary,
        episode_order=new_order
    )
    session.add(episode)
    session.commit()
    session.refresh(episode)
    
    # 2. Generate Initial Cuts Plan (Sync)
    project = session.get(Project, project_id)
    
    cuts_data = ai_service.generate_initial_cuts(
        episode_title=request.title,
        summary=request.summary,
        style=project.art_style or project.style_preset,
        num_cuts=request.num_cuts
    )
    
    created_cuts = []
    for c_data in cuts_data:
        cut = StoryCut(
            episode_id=episode.id,
            cut_order=c_data.get("cut_order", 0),
            script=c_data.get("script", ""),
            selected_layout=c_data.get("panel_type", "Square"),
            aspect_ratio="1:1", 
            dialogues=c_data.get("dialogues", [])
        )
        session.add(cut)
        created_cuts.append(cut)
    
    session.commit()
    
    return {"episode_id": episode.id, "cuts_count": len(created_cuts)}

@router.post("/episodes/{episode_id}/cuts/{cut_id}/generate-image")
def generate_cut_image_endpoint(
    episode_id: uuid.UUID,
    cut_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    cut = session.get(StoryCut, cut_id)
    if not cut:
        raise HTTPException(status_code=404, detail="Cut not found")
        
    background_tasks.add_task(bg_generate_cut_image, cut.id)
    return {"status": "processing", "cut_id": cut.id}

