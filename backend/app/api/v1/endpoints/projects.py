from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, col

from app.api import deps
from app.core import security
from app.models import Project, Workspace, WorkspaceMember, User, Character
from app.services.ai import ai_service
from pydantic import BaseModel
from datetime import datetime
from fastapi import BackgroundTasks
from app.services.storage import storage
from app.api.deps import engine

router = APIRouter()

class ProjectCreate(BaseModel):
    title: str
    subtitle: str | None = None
    genre: str | None = None
    worldview: dict | str | None = None
    style_preset: str = "anime_webtoon" # Default

class ProjectUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    genre: str | None = None
    worldview: dict | str | None = None
    style_preset: str | None = None
    description: str | None = None # For compatibility if description is added to model later or alias

class ProjectOut(BaseModel):
    id: Any
    title: str
    subtitle: str | None
    genre: str | None
    worldview: dict | str | None
    style_preset: str
    thumbnail_url: str | None
    created_at: datetime
    workspace_id: Any

class ProjectDetailOut(ProjectOut):
    characters: List[Any] = []

class StyleRecommendRequest(BaseModel):
    description: str

class WorldviewAugmentRequest(BaseModel):
    description: str
    title: str | None = None
    subtitle: str | None = None
    genres: List[str] | None = None

def generate_project_cover_task(project_id: str, title: str, genre: str, worldview_content: str, style: str):
    """
    Background task to generate and update project cover image.
    """
    try:
        print(f"Starting background cover generation for project {project_id}")
        # Generate Image
        img_bytes = ai_service.generate_project_cover_image(title, genre, worldview_content, style)
        
        # Upload to Storage
        if img_bytes:
            url = storage.upload_image(img_bytes)
            print(f"Cover image uploaded to {url}")
            
            # Update Project in DB
            with Session(engine) as session:
                # We need to convert project_id to UUID if it's str
                from uuid import UUID
                p_uuid = UUID(project_id)
                project = session.get(Project, p_uuid)
                if project:
                    project.thumbnail_url = url
                    session.add(project)
                    session.commit()
                    print(f"Project {project_id} thumbnail updated.")
    except Exception as e:
        print(f"Background Task Error: {e}")
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
    try:
        # Get user's default workspace (first one)
        ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
        member = session.exec(ws_statement).first()
        
        if not member:
             raise HTTPException(status_code=404, detail="No workspace found for user.")
        
        workspace_id = member.workspace_id

        # Handle worldview: Project model expects dict, input might be str
        final_worldview = project_in.worldview
        if isinstance(final_worldview, str):
            final_worldview = {"content": final_worldview, "title": f"{project_in.title} World"}

        project = Project(
            title=project_in.title,
            subtitle=project_in.subtitle,
            genre=project_in.genre,
            worldview=final_worldview,
            style_preset=project_in.style_preset,
            workspace_id=workspace_id,
            owner_id=current_user_id,
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        
        return project
    except Exception as e:
        raise e

@router.post("/worldview/augment")
def augment_worldview(
    *,
    request: WorldviewAugmentRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Augment the worldview description using AI.
    """
    try:
        result = ai_service.augment_worldview(
            description=request.description,
            title=request.title,
            subtitle=request.subtitle,
            genres=request.genres
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    *,
    session: Session = Depends(deps.get_session),
    project_id: str,
    project_in: ProjectUpdate,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Update a project.
    """
    from uuid import UUID
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    project = session.get(Project, project_uuid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update fields
    project_data = project_in.dict(exclude_unset=True)
    for key, value in project_data.items():
        if hasattr(project, key):
            setattr(project, key, value)

    session.add(project)
    session.commit()
    session.refresh(project)
    
    # Check if style was updated and trigger cover generation
    if project_in.style_preset and project_in.style_preset != "anime_webtoon": # Trigger if style is set to something specific
         # Extract worldview content safely
         wv_content = ""
         if project.worldview:
             if isinstance(project.worldview, dict):
                 wv_content = project.worldview.get("content", "") or project.worldview.get("description", "")
             else:
                 wv_content = str(project.worldview)
         
         background_tasks.add_task(
             generate_project_cover_task, 
             str(project.id), 
             project.title, 
             project.genre or "Fantasy", 
             wv_content, 
             project.style_preset
         )

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
