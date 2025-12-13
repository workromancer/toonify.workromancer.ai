from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select, col
from uuid import UUID

from app.api import deps
from app.core import security
from app.models import Project, Workspace, WorkspaceMember, User, Character, Genre, Asset
from app.services.ai import ai_service
from pydantic import BaseModel, root_validator
from datetime import datetime
from app.services.storage import storage
from app.api.deps import engine

router = APIRouter()

class ProjectCreate(BaseModel):
    title: str
    subtitle: str | None = None
    genre_id: UUID | None = None
    worldview: dict | str | None = None
    style_preset: str = "anime_webtoon" # Default
    style_reference_url: str | None = None

class ProjectUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    genre_id: UUID | None = None
    worldview: dict | str | None = None
    style_preset: str | None = None
    style_reference_url: str | None = None
    description: str | None = None

class ProjectOut(BaseModel):
    id: Any
    title: str
    subtitle: str | None
    genre: str | None = None # Resolved Name
    genre_id: UUID | None = None
    worldview: dict | str | None
    style_preset: str
    style_reference_url: str | None = None
    thumbnail_url: str | None = None
    cover_image_status: str | None = None
    created_at: datetime
    workspace_id: Any

    @root_validator(pre=True)
    def resolve_fields(cls, values):
        # Handle SQLModel object or dict
        # Ensure we extract values correctly
        
        # If 'values' is an ORM model
        if hasattr(values, "genre") and values.genre:
            values.genre_name = values.genre.name
            # If the validator expects 'genre' field to be the name
            # We can't easily mutate 'values' if it's an object unless we convert to dict.
            # But Pydantic 'from_orm' usually handles mapping.
            # Let's rely on manual mapping in response or property access if possible.
            # Actually, simpler: define properties
            pass
        return values
        
    class Config:
        orm_mode = True

# Helper to map Project to ProjectOut manually if needed, or rely on ORM
# We will intercept the response to ensure genre name and thumbnail_url are populated.
# Since we can't easily add logic to Pydantic v1 ORM mode for computed fields without properties on model,
# We will update the Project model to have properties or handle it in the endpoint.
# Let's add properties to Project model? No, that's in models.py.
# I'll modify the endpoint return values to ensure they are dicts with correct data.

class ProjectDetailOut(ProjectOut):
    characters: List[Any] = []

class StyleRecommendRequest(BaseModel):
    description: str

class WorldviewAugmentRequest(BaseModel):
    description: str
    title: str | None = None
    subtitle: str | None = None
    genres: List[str] | None = None

def generate_project_cover_task(project_id: str, title: str, genre_name: str, worldview_content: str, style: str, tones: List[str] = None, style_ref_url: str = None):
    """
    Background task to generate and update project cover image.
    """
    try:
        print(f"Starting background cover generation for project {project_id}")
        # Generate Image
        img_bytes = ai_service.generate_project_cover_image(title, genre_name, worldview_content, style, tones, style_ref_url)
        
        # Upload to Storage
        if img_bytes:
            url = storage.upload_image(img_bytes)
            print(f"Cover image uploaded to {url}")
            
            # Update Project in DB
            with Session(engine) as session:
                p_uuid = UUID(project_id)
                project = session.get(Project, p_uuid)
                if project:
                    # Create Asset
                    asset = Asset(
                        workspace_id=project.workspace_id,
                        user_id=project.owner_id,
                        filename=f"cover_{project_id}.png",
                        file_url=url,
                        file_type="image/png"
                    )
                    session.add(asset)
                    session.commit()
                    session.refresh(asset)

                    # Update Project
                    project.thumbnail_asset_id = asset.id
                    project.cover_image_asset_id = asset.id
                    project.cover_image_status = "completed"
                    session.add(project)
                    session.commit()
                    print(f"Project {project_id} thumbnail updated.")
    except Exception as e:
        print(f"Background Task Error: {e}")
        # Update status to failed
        with Session(engine) as session:
            try:
                p_uuid = UUID(project_id)
                project = session.get(Project, p_uuid)
                if project:
                    project.cover_image_status = "failed"
                    session.add(project)
                    session.commit()
            except Exception as db_e:
                print(f"Failed to update error status: {db_e}")

@router.get("/", response_model=List[ProjectOut])
def list_projects(
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    List all projects in workspaces the user is a member of.
    """
    statement = select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == current_user_id)
    workspace_ids = session.exec(statement).all()
    
    if not workspace_ids:
        return []

    statement = select(Project).where(col(Project.workspace_id).in_(workspace_ids))
    projects = session.exec(statement).all()

    # Manual mapping to valid dicts for ProjectOut
    results = []
    for p in projects:
        # Resolve Genre
        g_name = p.genre.name if p.genre else None
        
        # Resolve Thumbnail
        thumb = None
        # Explicitly load asset if needed or access lazy
        # Note: Accessing p.genre might trigger lazy load if session is active.
        if p.thumbnail_asset_id:
             # Just in case it's not loaded
             if not p.thumbnail_asset: # Attempt to access
                 pass 
             thumb = p.thumbnail_asset.file_url if p.thumbnail_asset else None
        
        p_dict = p.dict()
        p_dict['genre'] = g_name
        p_dict['thumbnail_url'] = thumb
        p_dict['cover_image_status'] = p.cover_image_status
        results.append(p_dict)
    
    return results

@router.post("/", response_model=ProjectOut)
def create_project(
    *,
    session: Session = Depends(deps.get_session),
    project_in: ProjectCreate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Create a new project.
    """
    try:
        # Get user's default workspace
        ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
        member = session.exec(ws_statement).first()
        
        if not member:
             raise HTTPException(status_code=404, detail="No workspace found for user.")
        
        workspace_id = member.workspace_id

        # Handle worldview: Project model expects dict
        final_worldview = project_in.worldview
        if isinstance(final_worldview, str):
            final_worldview = {"content": final_worldview, "title": f"{project_in.title} World", "tone": []}
        elif isinstance(final_worldview, dict):
             if "tone" not in final_worldview:
                 final_worldview["tone"] = []
             # Ensure tone is list if it's string (legacy?)
             if isinstance(final_worldview.get("tone"), str):
                  final_worldview["tone"] = [final_worldview["tone"]]

        project = Project(
            title=project_in.title,
            subtitle=project_in.subtitle,
            genre_id=project_in.genre_id,
            worldview=final_worldview,
            style_preset=project_in.style_preset,
            style_reference_url=project_in.style_reference_url,
            workspace_id=workspace_id,
            owner_id=current_user_id,
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        
        # Prepare response
        p_dict = project.dict()
        p_dict['genre'] = project.genre.name if project.genre else None
        p_dict['thumbnail_url'] = project.thumbnail_asset.file_url if project.thumbnail_asset else None
        p_dict['cover_image_status'] = project.cover_image_status

        return p_dict
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
    project_id: str,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Get project details.
    """
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    project = session.get(Project, project_uuid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    p_dict = project.dict()
    p_dict['genre'] = project.genre.name if project.genre else None
    p_dict['thumbnail_url'] = project.thumbnail_asset.file_url if project.thumbnail_asset else None
    p_dict['cover_image_status'] = project.cover_image_status
    
    # ProjectDetailOut needs characters (serialized)
    # The default simple serialization might work if characters are loaded?
    # Actually ProjectDetailOut defines characters: List[Any].
    # p_dict might not include characters if we called .dict().
    # .dict() on SQLModel only includes fields, not relationships unless we set exclude_unset=False etc?
    # Relationships are not included in .dict() by default usually.
    # We should populate characters manually.
    
    p_dict['characters'] = project.characters
    
    return p_dict

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
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    project = session.get(Project, project_uuid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update fields
    project_data = project_in.dict(exclude_unset=True)
    
    # Handle worldview tone normalization if present
    if 'worldview' in project_data and project_data['worldview']:
         wv = project_data['worldview']
         if isinstance(wv, dict):
             if "tone" not in wv:
                 wv["tone"] = []
             if isinstance(wv.get("tone"), str):
                  wv["tone"] = [wv["tone"]]
         project_data['worldview'] = wv

    for key, value in project_data.items():
        if hasattr(project, key):
            setattr(project, key, value)

    session.add(project)
    session.commit()
    session.refresh(project)
    
    p_dict = project.dict()
    p_dict['genre'] = project.genre.name if project.genre else None
    p_dict['thumbnail_url'] = project.thumbnail_asset.file_url if project.thumbnail_asset else None
    p_dict['cover_image_status'] = project.cover_image_status

    return p_dict

@router.post("/{project_id}/cover", response_model=Any)
def generate_cover(
    *,
    session: Session = Depends(deps.get_session),
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Trigger AI cover image generation for the project.
    """
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    project = session.get(Project, project_uuid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Extract worldview content
    wv_content = ""
    tones = []
    if project.worldview:
        if isinstance(project.worldview, dict):
             wv_content = project.worldview.get("content", "") or project.worldview.get("description", "")
             tones = project.worldview.get("tone", [])
             if isinstance(tones, str): # Legacy check
                 tones = [tones]
        else:
             wv_content = str(project.worldview)
    
    genre_name = project.genre.name if project.genre else "Fantasy"

    # Set status to processing immediately
    project.cover_image_status = "processing"
    session.add(project)
    session.commit()
    session.refresh(project)

    background_tasks.add_task(
        generate_project_cover_task, 
        str(project.id), 
        project.title, 
        genre_name, 
        wv_content, 
        project.style_preset,
        tones,
        project.style_reference_url if project.style_reference_url else None
    )

    return {"message": "Cover generation started"}

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
