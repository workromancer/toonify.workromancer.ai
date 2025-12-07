from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.api import deps
from app.models import Episode, StoryCut, Project
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter()

class StoryCutCreate(BaseModel):
    episode_id: UUID
    cut_order: int
    script: str = ""
    selected_layout: str = "single"
    aspect_ratio: str = "1:1"
    dialogues: List[dict] = []

class StoryCutUpdate(BaseModel):
    script: Optional[str] = None
    selected_layout: Optional[str] = None
    aspect_ratio: Optional[str] = None
    dialogues: Optional[List[dict]] = None
    image_path: Optional[str] = None
    cut_order: Optional[int] = None

class StoryCutOut(BaseModel):
    id: Any
    episode_id: Any
    cut_order: int
    script: str
    selected_layout: str
    aspect_ratio: str
    dialogues: List[dict]
    image_path: Optional[str] = None
    created_at: datetime

@router.get("/", response_model=List[StoryCutOut])
def list_cuts(
    *,
    session: Session = Depends(deps.get_session),
    episode_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    List cuts for a specific episode.
    """
    statement = select(StoryCut).where(StoryCut.episode_id == episode_id).order_by(StoryCut.cut_order)
    cuts = session.exec(statement).all()
    return cuts

@router.post("/", response_model=StoryCutOut)
def create_cut(
    *,
    session: Session = Depends(deps.get_session),
    cut_in: StoryCutCreate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Create a new story cut.
    """
    cut = StoryCut(
        episode_id=cut_in.episode_id,
        cut_order=cut_in.cut_order,
        script=cut_in.script,
        selected_layout=cut_in.selected_layout,
        aspect_ratio=cut_in.aspect_ratio,
        dialogues=cut_in.dialogues
    )
    session.add(cut)
    session.commit()
    session.refresh(cut)
    return cut

@router.put("/{cut_id}", response_model=StoryCutOut)
def update_cut(
    *,
    session: Session = Depends(deps.get_session),
    cut_id: UUID,
    cut_in: StoryCutUpdate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Update a story cut.
    """
    cut = session.get(StoryCut, cut_id)
    if not cut:
        raise HTTPException(status_code=404, detail="Cut not found")
        
    cut_data = cut_in.dict(exclude_unset=True)
    for key, value in cut_data.items():
        setattr(cut, key, value)
        
    session.add(cut)
    session.commit()
    session.refresh(cut)
    return cut


@router.delete("/{cut_id}", status_code=204)
def delete_cut(
    *,
    session: Session = Depends(deps.get_session),
    cut_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Delete a story cut.
    """
    cut = session.get(StoryCut, cut_id)
    if not cut:
        raise HTTPException(status_code=404, detail="Cut not found")
        
    session.delete(cut)
    session.commit()
    return None
