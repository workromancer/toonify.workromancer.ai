from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col

from app.api import deps
from app.models import Character, Project
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter()

class CharacterCreate(BaseModel):
    name: str
    project_id: UUID
    appearance_tags: List[str] = []
    default_mood: str = "neutral"

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    appearance_tags: Optional[List[str]] = None
    default_mood: Optional[str] = None
    profile_image_url: Optional[str] = None

class CharacterOut(BaseModel):
    id: Any
    name: str
    project_id: Any
    appearance_tags: List[str]
    default_mood: str
    profile_image_url: str | None
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
        consistency_seed=0, # Default, generate later
        profile_image_url=None
    )
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
    for key, value in character_data.items():
        setattr(character, key, value)
        
    session.add(character)
    session.commit()
    session.refresh(character)
    return character

@router.post("/{character_id}/generate", response_model=CharacterOut)
def generate_character_image(
    *,
    session: Session = Depends(deps.get_session),
    character_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Generate a profile image for the character using AI.
    """
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
        
    project = session.get(Project, character.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Construct prompt
    # "anime_webtoon character portrait of {name}, {tags}, {mood}"
    tags_str = ", ".join(character.appearance_tags)
    prompt = f"{project.style_preset} style character portrait of {character.name}, {tags_str}, {character.default_mood} expression, high quality, webtoon aesthetic"
    
    # Generate Image
    from app.services.ai import ai_service
    import base64
    
    try:
        image_bytes = ai_service.generate_image(prompt=prompt, width=512, height=512)
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:image/png;base64,{base64_image}"
        
        # Save to DB
        character.profile_image_url = data_url
        session.add(character)
        session.commit()
        session.refresh(character)
        
        return character
    except Exception as e:
        print(f"Character Generation Failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate character image")
