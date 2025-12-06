from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api import deps
import time

router = APIRouter()

class GenerateRequest(BaseModel):
    prompt: str
    width: int
    height: int
    style_preset: str = "anime_webtoon"

class GenerateResponse(BaseModel):
    image_url: str

@router.post("/generate", response_model=GenerateResponse)
def generate_image(
    *,
    request: GenerateRequest,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Mock AI Generation. Returns a placeholder image based on keywords.
    """
    # Simulate processing time
    time.sleep(1)
    
    # Simple logic to return different placeholders
    keyword = "city"
    if "character" in request.prompt.lower():
        keyword = "person"
    elif "nature" in request.prompt.lower():
        keyword = "nature"
    elif "fantasy" in request.prompt.lower():
        keyword = "fantasy"
        
    # Use Unsplash Source for persistent randomish images
    # Note: source.unsplash.com is deprecated/redirects, using images.unsplash.com with parameters
    # Actually, plain unsplash source might be flaky. Let's use a reliable placeholder service or static realistic URLs.
    
    if keyword == "city":
        image_url = "https://images.unsplash.com/photo-1449824913929-2b3a3e3dbf3d?w=800&q=80"
    elif keyword == "person":
        image_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80"
    elif keyword == "nature":
        image_url = "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80"
    else:
        image_url = f"https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&q=80" # Default texture/abstract

    return GenerateResponse(image_url=image_url)
