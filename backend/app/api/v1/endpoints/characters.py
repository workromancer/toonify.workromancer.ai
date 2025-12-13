from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col

from app.api import deps
from app.models import Character, Project, Asset
from pydantic import BaseModel
from datetime import datetime
from datetime import datetime
from uuid import UUID
from fastapi import BackgroundTasks
from app.services.storage import storage
from app.api.deps import engine
from app.services.ai import ai_service

router = APIRouter()

class CharacterCreate(BaseModel):
    name: str
    project_id: UUID
    appearance_tags: List[str] = []
    default_mood: List[str] = []
    description: Optional[str] = None

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    appearance_tags: Optional[List[str]] = None
    default_mood: Optional[List[str]] = None
    profile_image_url: Optional[str] = None
    description: Optional[str] = None

class CharacterAugmentRequest(BaseModel):
    name: str
    tags: List[str]
    mood: List[str]
    project_id: UUID

class CharacterOut(BaseModel):
    id: Any
    name: str
    project_id: Any
    appearance_tags: List[str] = []
    default_mood: Any = [] # Handle list or json string
    profile_image_url: Optional[str] = None
    description: Optional[str] = None
    sheet_status: Optional[str] = "pending"
    created_at: datetime

@router.get("/", response_model=List[CharacterOut])
def list_characters(
    *,
    session: Session = Depends(deps.get_session),
    project_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    List characters for a specific project.
    """
    # Verify access
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    statement = select(Character).where(Character.project_id == project_id)
    characters = session.exec(statement).all()
    return characters

@router.post("/", response_model=CharacterOut)
def create_character(
    *,
    session: Session = Depends(deps.get_session),
    character_in: CharacterCreate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Create a new character.
    """
    # Verify project exists
    project = session.get(Project, character_in.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    character = Character(
        name=character_in.name,
        project_id=character_in.project_id,
        appearance_tags=character_in.appearance_tags,
        default_mood=character_in.default_mood,

        consistency_seed=0,
        profile_image_url=None,
        description=character_in.description
    )
    # Generate Embedding
    mood_str = " ".join(character_in.default_mood)
    combined_text = f"{character_in.name} {mood_str} {' '.join(character_in.appearance_tags)}"
    character.embedding = ai_service.get_embedding(combined_text)

    session.add(character)
    session.commit()
    session.refresh(character)
    return character

@router.patch("/{character_id}", response_model=CharacterOut)
def update_character(
    *,
    session: Session = Depends(deps.get_session),
    character_id: UUID,
    character_in: CharacterUpdate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Update a character.
    """
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
        
    character_data = character_in.dict(exclude_unset=True)
    should_update_embedding = any(k in character_data for k in ["name", "appearance_tags", "default_mood", "description"])
    
    for key, value in character_data.items():
        setattr(character, key, value)

    if should_update_embedding:
        tags = character.appearance_tags or []
        desc = character.description or ""
        moods = character.default_mood or []
        mood_str = " ".join(moods)
        combined_text = f"{character.name} {mood_str} {' '.join(tags)} {desc}"
        character.embedding = ai_service.get_embedding(combined_text)
        
    session.add(character)
    session.commit()
    session.refresh(character)
    session.refresh(character)
    return character

@router.get("/{character_id}", response_model=CharacterOut)
def get_character(
    *,
    session: Session = Depends(deps.get_session),
    character_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Get a specific character by ID.
    """
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


class CharacterOption(BaseModel):
    name: str
    age: str
    personality: str
    features: List[str]
    pros: List[str]
    cons: List[str]
    visual_description: str
    reason: Optional[str] = None

class CharacterAugmentResponse(BaseModel):
    options: List[CharacterOption]

@router.post("/augment", response_model=CharacterAugmentResponse)
def augment_character(
    *,
    request: CharacterAugmentRequest,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
):
    """
    Augments character tags and description into 3 distinct options.
    """
    project = session.get(Project, request.project_id)
    if not project:
         raise HTTPException(status_code=404, detail="Project not found")

    # Construct Context
    wv_desc = ""
    if project.worldview:
        if isinstance(project.worldview, dict):
            # Prefer 'content' or 'description'
            wv_desc = project.worldview.get("content") or project.worldview.get("description") or ""
        else:
             wv_desc = str(project.worldview)

    project_context = f"""
    Title: {project.title}
    Genre: {project.genre or 'Unknown'}
    Worldview: {wv_desc}
    """

    result = ai_service.augment_character_text(
        name=request.name,
        tags=request.tags,
        mood=request.mood,
        style=project.style_preset,
        project_context=project_context
    )
    return result

def generate_character_image_task(character_id: UUID, prompt: str):
    """
    Background task to generate character sheet and save it.
    """
    try:
        print(f"Starting background character generation for {character_id}")
        
        with Session(engine) as session:
            character = session.get(Character, character_id)
            if not character:
                print(f"Character {character_id} not found via background task.")
                return
            
            # Update status to processing
            character.sheet_status = "processing"
            session.add(character)
            session.commit()
            
            project = session.get(Project, character.project_id)
            if not project:
                print(f"Project for character {character_id} not found.")
                return

            try:
                # Using the specialized character sheet generation
                # Fallback to name if no description or tags
                desc_for_img = character.description or ", ".join(character.appearance_tags) or character.name
                img_bytes = ai_service.generate_character_sheet(character.name, desc_for_img, project.style_preset)
                
                if img_bytes:
                    url = storage.upload_image(img_bytes)
                    
                    # Create Asset record
                    asset = Asset(
                        filename=f"character_{character.id}_sheet.png",
                        file_url=url,
                        file_type="image/png",
                        workspace_id=project.workspace_id
                    )
                    session.add(asset)
                    session.flush() # Get asset.id
                    
                    character.profile_image_asset_id = asset.id
                    character.sheet_status = "completed"
                    session.add(character)
                    session.commit()
                    print(f"Character {character_id} image updated: {url}")
                else:
                    print("No image bytes returned for character generation.")
                    character.sheet_status = "failed"
                    session.add(character)
                    session.commit()
                    
            except Exception as e:
                print(f"Generation logic error: {e}")
                character.sheet_status = "failed"
                session.add(character)
                session.commit()
                
    except Exception as e:
        print(f"Background Character Gen Task Error: {e}")
                


@router.post("/{character_id}/generate", response_model=CharacterOut)
def generate_character_image(
    *,
    session: Session = Depends(deps.get_session),
    character_id: UUID,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Start background generation of character sheet.
    """
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
        
    project = session.get(Project, character.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Set status to processing immediately
    character.sheet_status = "processing"
    session.add(character)
    session.commit()
    session.refresh(character)

    # Add background task
    background_tasks.add_task(generate_character_image_task, character_id, "")
    
    return character
