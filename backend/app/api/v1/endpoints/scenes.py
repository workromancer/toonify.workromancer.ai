from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Body
from app.api import deps
from app.services.ai import ai_service
from pydantic import BaseModel

router = APIRouter()

class SceneStructureRequest(BaseModel):
    script: str
    project_id: str | None = None

class SceneRenderRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 1024
    seed: int = None

@router.post("/structure")
def generate_scene_structure(
    *,
    request: SceneStructureRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Dict:
    """
    Generate 3 visual direction options based on the script.
    """
    try:
        # Fetch characters for consistency if project_id is provided
        character_context = ""
        if request.project_id:
            from sqlmodel import Session, select
            from app.api.deps import engine
            from app.models.models import Character
            
            with Session(engine) as session:
                statement = select(Character).where(Character.project_id == request.project_id)
                characters = session.exec(statement).all()
                if characters:
                    context_parts = []
                    for char in characters:
                         # Combine name, role, and appearance description
                         desc = f"{char.name} ({char.role}): {char.appearance}"
                         context_parts.append(desc)
                    character_context = "Characters: " + "; ".join(context_parts)
                    print(f"Injecting Character Context: {character_context}")

        options = ai_service.generate_direction_options(request.script, character_context)
        return options
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SceneModifyRequest(BaseModel):
    original_image_url: str
    instruction: str

@router.post("/modify")
def modify_scene(
    *,
    request: SceneModifyRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Modify an existing scene image based on instruction.
    """
    try:
        image_bytes = ai_service.modify_image(request.original_image_url, request.instruction)
        
        import base64
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        return {"image_url": f"data:image/png;base64,{base64_image}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/render")
def render_scene(
    *,
    request: SceneRenderRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Render a scene based on the selected direction prompt.
    Returns the image URL (or base64/bytes for now).
    """
    try:
        # In a real app, we would upload to GCS and return URL.
        # For now, we return raw bytes or a base64 string.
        # Let's return a mock URL or base64 for simplicity in frontend.
        
        image_bytes = ai_service.generate_image(request.prompt, request.width, request.height, request.seed)
        
        # Convert to base64 for easy frontend display without storage setup
        import base64
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        return {
            "image_url": f"data:image/png;base64,{base64_image}",
            "seed": request.seed # Return the seed used (or generated if we were generating random ones, but here we pass what we got)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
