from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from app.api import deps
from app.services.ai import ai_service
from app.services.billing import billing_service
from app.models import Project, WorkspaceMember, Character
from pydantic import BaseModel
from uuid import UUID

router = APIRouter()

class SceneStructureRequest(BaseModel):
    script: str
    project_id: str | None = None

class SceneRenderRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 1024
    seed: int = None
    project_id: str | None = None # Required for billing context

def get_workspace_id(session: Session, user_id: str, project_id: str | None = None) -> UUID:
    """Helper to resolve workspace ID from project or user default."""
    if project_id:
        try:
           # Validate UUID format if string
           p_uuid = UUID(project_id) if isinstance(project_id, str) else project_id
           project = session.get(Project, p_uuid)
           if project:
               return project.workspace_id
        except ValueError:
            pass # Invalid UUID, fall through to default
            
    # Fallback: Get first workspace
    statement = select(WorkspaceMember).where(WorkspaceMember.user_id == user_id)
    member = session.exec(statement).first()
    if not member:
         raise HTTPException(status_code=400, detail="User has no workspace to charge credits to.")
    return member.workspace_id

@router.post("/structure")
def generate_scene_structure(
    *,
    request: SceneStructureRequest,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Dict:
    """
    Generate 3 visual direction options based on the script.
    """
    # 1. Billing Check & Deduction
    workspace_id = get_workspace_id(session, current_user_id, request.project_id)
    billing_service.deduct_credits(session, workspace_id, UUID(current_user_id), "director_suggestion")

    try:
        # Context Gathering
        context_str = ""
        
        # A. Character Context
        if request.project_id:
            project_uuid = UUID(request.project_id)
            characters = session.exec(
                select(Character).where(Character.project_id == project_uuid)
            ).all()
            
            if characters:
                char_parts = [f"{c.name} ({c.default_mood}): {', '.join(c.appearance_tags)}" for c in characters]
                context_str += "CHARACTERS:\n" + "\n".join(char_parts) + "\n\n"

            # B. RAG - Scene Context (Visual Continuity)
            # Find similar previous cuts to maintain visual tone
            try:
                from app.models import StoryCut, Episode
                target_embedding = ai_service.get_embedding(request.script)
                
                # Query similar cuts in this project
                # Join StoryCut -> Episode -> Project to filter by project_id
                stmt = select(StoryCut).join(Episode).where(
                    Episode.project_id == project_uuid,
                    StoryCut.embedding.is_not(None)
                ).order_by(StoryCut.embedding.cosine_distance(target_embedding)).limit(3)
                
                similar_cuts = session.exec(stmt).all()
                
                if similar_cuts:
                    rag_parts = []
                    for cut in similar_cuts:
                        rag_parts.append(f"- Script: {cut.script}\n  Visual: {cut.selected_layout}")
                    
                    context_str += "SIMILAR PREVIOUS SCENES (For Visual Consistency):\n" + "\n".join(rag_parts)
            except Exception as e:
                print(f"RAG Retrieval warning: {e}")

        options = ai_service.generate_direction_options(request.script, context_str)
        return options
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SceneModifyRequest(BaseModel):
    original_image_url: str
    instruction: str
    project_id: str | None = None

@router.post("/modify")
def modify_scene(
    *,
    request: SceneModifyRequest,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Modify an existing scene image based on instruction.
    """
    # 1. Billing Check & Deduction (Uses Image Generation cost for now?)
    # Implementation Plan says "Director's Cut" might have its own cost, assuming 'image_generation' or 'upscale' or custom.
    # Let's use 'image_generation' for modify.
    workspace_id = get_workspace_id(session, current_user_id, request.project_id)
    billing_service.deduct_credits(session, workspace_id, UUID(current_user_id), "image_generation")

    try:
        image_bytes = ai_service.modify_image(request.original_image_url, request.instruction)
        
        import base64
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        return {"image_url": f"data:image/png;base64,{base64_image}"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/render")
def render_scene(
    *,
    request: SceneRenderRequest,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Render a scene based on the selected direction prompt.
    Returns the image URL (or base64/bytes for now).
    """
    # 1. Billing Check & Deduction
    workspace_id = get_workspace_id(session, current_user_id, request.project_id)
    billing_service.deduct_credits(session, workspace_id, UUID(current_user_id), "image_generation")

    try:
        # In a real app, we would upload to GCS and return URL.
        # For now, we return raw bytes or a base64 string.
        
        image_bytes = ai_service.generate_image(request.prompt, request.width, request.height, request.seed)
        
        # Convert to base64 for easy frontend display without storage setup
        import base64
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        return {
            "image_url": f"data:image/png;base64,{base64_image}",
            "seed": request.seed # Return the seed used (or generated if we were generating random ones, but here we pass what we got)
        }
    except HTTPException as he:
        raise he     
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
