from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, col

from app.api import deps
from app.core import security
from app.models import Project, Workspace, WorkspaceMember, User, Character
from app.services.ai import ai_service
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class ProjectCreate(BaseModel):
    title: str
    style_preset: str = "anime_webtoon" # Default

class ProjectOut(BaseModel):
    id: Any
    title: str
    style_preset: str
    thumbnail_url: str | None
    created_at: datetime
    workspace_id: Any

class ProjectDetailOut(ProjectOut):
    characters: List[Any] = []

class StyleRecommendRequest(BaseModel):
    description: str

@router.get("/", response_model=List[ProjectOut])
def list_projects(
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id), # We need a dep to get user ID from token
) -> Any:
    """
    List all projects in workspaces the user is a member of.
    For MVP, we just list projects created by owner or in their workspaces.
    """
    # 1. Get user workspaces
    # SQLModel doesn't support easy many-to-many query in one go very intuitively compared to ORM, 
    # but let's query WorkspaceMember
    
    # Simple query: Projects where owner_id == current_user
    # Better: Projects in Workspaces I am a member of.
    
    # Get workspace IDs member is in
    statement = select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == current_user_id)
    workspace_ids = session.exec(statement).all()
    
    if not workspace_ids:
        return []

    # Get projects in these workspaces
    statement = select(Project).where(col(Project.workspace_id).in_(workspace_ids))
    projects = session.exec(statement).all()
    
    return projects

@router.post("/", response_model=ProjectOut)
def create_project(
    *,
    session: Session = Depends(deps.get_session),
    project_in: ProjectCreate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Create a new project.
    For MVP, we assign it to the user's first Workspace (default).
    """
    # Get user's default workspace (first one)
    ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
    member = session.exec(ws_statement).first()
    
    if not member:
         raise HTTPException(status_code=404, detail="No workspace found for user.")
    
    workspace_id = member.workspace_id

    project = Project(
        title=project_in.title,
        style_preset=project_in.style_preset,
        workspace_id=workspace_id,
        owner_id=current_user_id,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    
    return project

@router.get("/{project_id}", response_model=ProjectDetailOut)
def get_project(
    *,
    session: Session = Depends(deps.get_session),
    project_id: str, # Keep as str or change to UUID? Let's check imports first.
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Get project details including characters.
    """
    # Convert regex validation or type
    from uuid import UUID
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    project = session.get(Project, project_uuid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check permissions (simplified)
    # real app: check if user is in workspace of project
    
    return project

@router.post("/styles/recommend")
def recommend_styles(
    *,
    request: StyleRecommendRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Recommend 3 style options based on description using AI.
    """
    try:
        styles = ai_service.recommend_style(request.description)
        return styles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
