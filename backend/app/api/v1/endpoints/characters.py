from typing import Any, List
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
