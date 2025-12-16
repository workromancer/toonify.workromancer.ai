from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select, col
from uuid import UUID

from app.api import deps
from app.core import security
from app.models import Project, Workspace, WorkspaceMember, User, Character, Genre, Asset
from app.services.ai import ai_service
from app.services.billing import billing_service
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
        if hasattr(values, "genre") and values.genre:
            values.genre_name = values.genre.name
        return values
        
    class Config:
        orm_mode = True

class ProjectDetailOut(ProjectOut):
    characters: List[Any] = []

class StyleRecommendRequest(BaseModel):
    description: str

class WorldviewAugmentRequest(BaseModel):
    description: str
    title: str | None = None
    subtitle: str | None = None
    genres: List[str] | None = None

def generate_project_cover_task(project_id: str, title: str, genre_name: str, worldview_content: str, style: str, tones: List[str] = None, style_ref_url: str = None, character_image_urls: List[str] = None):
    """
    Background task to generate and update project cover image.
    """
    try:
        print(f"Starting background cover generation for project {project_id}")
        # Generate Image
        img_bytes = ai_service.generate_project_cover_image(title, genre_name, worldview_content, style, tones, style_ref_url, character_image_urls)
        
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

@router.get("", response_model=List[ProjectOut])
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
        if p.thumbnail_asset_id:
             if not p.thumbnail_asset: 
                 pass 
             thumb = p.thumbnail_asset.file_url if p.thumbnail_asset else None
        
        p_dict = p.dict()
        p_dict['genre'] = g_name
        p_dict['thumbnail_url'] = thumb
        p_dict['cover_image_status'] = p.cover_image_status
        results.append(p_dict)
    
    return results

@router.post("", response_model=ProjectOut)
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

        # Handle worldview
        final_worldview = project_in.worldview
        if isinstance(final_worldview, str):
            final_worldview = {"content": final_worldview, "title": f"{project_in.title} World", "tone": []}
        elif isinstance(final_worldview, dict):
             if "tone" not in final_worldview:
                 final_worldview["tone"] = []
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
    session: Session = Depends(deps.get_session),
    request: WorldviewAugmentRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Augment the worldview description using AI.
    """
    try:
        # Deduct Credits (Cost: 5)
        ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
        member = session.exec(ws_statement).first()
        if not member:
             raise HTTPException(status_code=404, detail="No workspace found for user.")
        
        billing_service.deduct_credits(session, member.workspace_id, UUID(current_user_id), "augment_worldview")

        result = ai_service.augment_worldview(
            description=request.description,
            title=request.title,
            subtitle=request.subtitle,
            genres=request.genres
        )
        return result
    except HTTPException as he:
        raise he
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
    project = session.get(Project, project_uuid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    p_dict = project.dict()
    p_dict['genre'] = project.genre.name if project.genre else None
    p_dict['thumbnail_url'] = project.thumbnail_asset.file_url if project.thumbnail_asset else None
    p_dict['cover_image_status'] = project.cover_image_status
    
    # Robust serialization
    chars_data = []
    try:
        if project.characters:
            for c in project.characters:
                try:
                    chars_data.append(c.dict())
                except Exception as e:
                    print(f"Failed to serialize character {c.id}: {e}")
    except Exception as e:
        print(f"Failed to load characters: {e}")
        
    p_dict['characters'] = chars_data
    
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

    project_data = project_in.dict(exclude_unset=True)
    
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

    # Deduct Credits (Cost: 15)
    billing_service.deduct_credits(session, project.workspace_id, UUID(current_user_id), "generate_project_cover_image")

    wv_content = ""
    tones = []
    if project.worldview:
        if isinstance(project.worldview, dict):
             wv_content = project.worldview.get("content", "") or project.worldview.get("description", "")
             tones = project.worldview.get("tone", [])
             if isinstance(tones, str):
                 tones = [tones]
        else:
             wv_content = str(project.worldview)
    
    genre_name = project.genre.name if project.genre else "Fantasy"
    
    char_statement = select(Character).where(Character.project_id == project.id).limit(6)
    chars = session.exec(char_statement).all()
    char_urls = []
    for c in chars:
        if c.profile_image_url:
            char_urls.append(c.profile_image_url)
    
    print(f"Found {len(char_urls)} character images for cover generation.")

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
        project.style_reference_url if project.style_reference_url else None,
        char_urls
    )

    return {"message": "Cover generation started"}

@router.post("/styles/recommend")
def recommend_styles(
    *,
    session: Session = Depends(deps.get_session),
    request: StyleRecommendRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Recommend 3 style options based on description using AI.
    """
    try:
        # Deduct Credits (Cost: 1)
        ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
        member = session.exec(ws_statement).first()
        if not member:
             raise HTTPException(status_code=404, detail="No workspace found for user.")
        
        billing_service.deduct_credits(session, member.workspace_id, UUID(current_user_id), "recommend_style")

        styles = ai_service.recommend_style(request.description)
        return styles
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
