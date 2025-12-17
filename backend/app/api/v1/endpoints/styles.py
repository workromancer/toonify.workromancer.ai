from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from uuid import UUID

from app.api import deps
from app.models import CustomStyle, WorkspaceMember, Project, Genre, ProjectGenre
from app.services.ai import ai_service
from app.services.storage import storage
from pydantic import BaseModel
from app.api.deps import engine

router = APIRouter()

class AugmentStyleRequest(BaseModel):
    prompt: str
    projectId: Optional[str] = None
    language: str = "en"

class AugmentStyleResponse(BaseModel):
    result: str

@router.post("/augment", response_model=AugmentStyleResponse)
def augment_style(
    *,
    request: AugmentStyleRequest,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Augment style description using AI.
    """
    project_context = {}
    if request.projectId:
        project = session.get(Project, request.projectId)
        if project:
            # Get genres properly
            genres = []
            # Assuming ProjectGenre relationship is set up or we fetch manually
            # But based on seed_db update, we know the model Project has relations.
            # Let's check model definition if we can, but simpler is to try getting genres.
            # wait, I don't want to break if relationship isn't loaded.
            # Let's peek at models.py quickly via search if needed, but I'll assume basic query for now.
            try:
                # Direct query for genres if relationship loading is uncertain
                pgs = session.exec(select(Genre).join(ProjectGenre).where(ProjectGenre.project_id == project.id)).all()
                genres = [g.name for g in pgs]
            except Exception:
                pass
                
            project_context = {
                "title": project.title,
                "worldview": project.worldview_description,
                "genres": genres
            }

    try:
        enhanced_prompt = ai_service.augment_style_description(
            current_prompt=request.prompt,
            project_context=project_context,
            language=request.language
        )
        return AugmentStyleResponse(result=enhanced_prompt)
    except Exception as e:
        print(f"Augmentation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



class StyleCreate(BaseModel):
    name: str
    description: str

class StyleOut(BaseModel):
    id: Any
    name: str
    description: str
    image_url: str | None
    status: str
    created_at: Any

def generate_style_preview_task(style_id: str, description: str):
    """
    Background task to generate style preview image.
    """
    try:
        print(f"Starting background style generation for {style_id}")
        
        # Determine strict Prompt for style preview
        # We want a representative image of the style
        prompt = f"""
        Create a high-quality representative illustration of this art style:
        "{description}"
        
        Usage: This image will be used as a reference preview for this art style.
        Subject: A character portrait or a scenic view that best showcases the texture, lighting, and rendering technique of this style.
        Aspect Ratio: Square (1:1).
        """
        
        img_bytes = ai_service.generate_image(prompt, width=512, height=512)
        
        if img_bytes:
            url = storage.upload_image(img_bytes)
            print(f"Style preview uploaded to {url}")
            
            with Session(engine) as session:
                s_uuid = UUID(style_id)
                style = session.get(CustomStyle, s_uuid)
                if style:
                    style.image_url = url
                    style.status = "completed"
                    session.add(style)
                    session.commit()
    except Exception as e:
        print(f"Style Generation Failed: {e}")
        with Session(engine) as session:
            try:
                s_uuid = UUID(style_id)
                style = session.get(CustomStyle, s_uuid)
                if style:
                    style.status = "failed"
                    session.add(style)
                    session.commit()
            except Exception:
                pass

@router.get("", response_model=List[StyleOut])
def list_my_styles(
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    List custom styles for the current user's workspace.
    """
    # Get user's workspace
    ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
    member = session.exec(ws_statement).first()
    
    if not member:
        return []
    
    statement = select(CustomStyle).where(CustomStyle.workspace_id == member.workspace_id).order_by(CustomStyle.created_at.desc())
    styles = session.exec(statement).all()
    return styles

@router.post("", response_model=StyleOut)
def create_style(
    *,
    session: Session = Depends(deps.get_session),
    style_in: StyleCreate,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Create a new custom style and trigger preview generation.
    """
    # Get user's workspace
    ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
    member = session.exec(ws_statement).first()
    
    if not member:
         raise HTTPException(status_code=404, detail="No workspace found for user.")
    
    style = CustomStyle(
        workspace_id=member.workspace_id,
        name=style_in.name,
        description=style_in.description,
        status="processing"
    )
    
    session.add(style)
    session.commit()
    session.refresh(style)
    
    # Trigger background generation
    background_tasks.add_task(generate_style_preview_task, str(style.id), style.description)
    
    return style

@router.post("/{style_id}/regenerate", response_model=StyleOut)
def regenerate_style(
    *,
    style_id: str,
    session: Session = Depends(deps.get_session),
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Regenerate a failed style.
    """
    try:
        s_uuid = UUID(style_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    style = session.get(CustomStyle, s_uuid)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")

    # Update status
    style.status = "processing"
    session.add(style)
    session.commit()
    session.refresh(style)

    # Trigger background generation
    background_tasks.add_task(generate_style_preview_task, str(style.id), style.description)
    
    return style
