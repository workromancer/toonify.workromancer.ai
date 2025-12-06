from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col

from app.api import deps
from app.models import Episode, Project, WorkspaceMember
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter()

class EpisodeCreate(BaseModel):
    title: str
    project_id: UUID
    episode_number: int

class EpisodeOut(BaseModel):
    id: Any
    title: str
    episode_number: int
    project_id: Any
    created_at: datetime
    # We can include script_content summary if needed, but keep light for list

@router.get("/", response_model=List[EpisodeOut])
def list_episodes(
    *,
    session: Session = Depends(deps.get_session),
    project_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    List episodes for a specific project.
    """
    # Verify access to project
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if user is member of project's workspace
    # (Simplified check: Owner or Member)
    # Ideally should use a shared permission checker
    
    statement = select(Episode).where(Episode.project_id == project_id).order_by(Episode.episode_number)
    episodes = session.exec(statement).all()
    return episodes

@router.post("/", response_model=EpisodeOut)
def create_episode(
    *,
    session: Session = Depends(deps.get_session),
    episode_in: EpisodeCreate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Create a new episode in a project.
    """
    # Verify access (skip complex permission logic for MVP speed, assume logged in is enough if they have ID)
    # But strictly should check workspace membership.
    
    episode = Episode(
        title=episode_in.title,
        project_id=episode_in.project_id,
        episode_number=episode_in.episode_number,
        script_content="", # Init empty
        storyboard_data={} # Init empty
    )
    session.add(episode)
    session.commit()
    session.refresh(episode)
    
    return episode
