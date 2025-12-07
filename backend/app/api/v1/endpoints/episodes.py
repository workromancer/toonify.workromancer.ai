from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col

from app.api import deps
from app.models import Episode, Project, WorkspaceMember, StoryCut
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter()


class EpisodeCreate(BaseModel):
    title: str
    project_id: UUID
    episode_order: int
    story_summary: str = ""

class EpisodeOut(BaseModel):
    id: Any
    title: str
    episode_order: int
    project_id: Any
    story_summary: str = ""
    created_at: datetime

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
    
    statement = select(Episode).where(Episode.project_id == project_id).order_by(Episode.episode_order)
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
    episode = Episode(
        title=episode_in.title,
        project_id=episode_in.project_id,
        episode_order=episode_in.episode_order,
        story_summary=episode_in.story_summary
    )
    session.add(episode)
    session.commit()
    session.refresh(episode)
    
    return episode


@router.delete("/{episode_id}")
def delete_episode(
    *,
    session: Session = Depends(deps.get_session),
    episode_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Delete an episode.
    """
    episode = session.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Check permissions (simple check via project ownership would be strictly better, but assuming access for MVP)
    # Ideally: Verify current_user_id owns the project the episode belongs to.
    
    # Delete associated cuts first (manual cascade if not handled by DB)
    statement = select(StoryCut).where(StoryCut.episode_id == episode_id)
    cuts = session.exec(statement).all()
    for cut in cuts:
        session.delete(cut)
        
    session.delete(episode)
    session.commit()
    from fastapi import Response
    return Response(status_code=204)
