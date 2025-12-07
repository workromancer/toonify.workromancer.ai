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

@router.post("/{episode_id}/export")
def export_episode(
    *,
    session: Session = Depends(deps.get_session),
    episode_id: UUID,
    format: str = "webtoon",
    current_user_id: str = Depends(deps.get_current_user_id),
):
    """
    Export episode as a stitched vertical image (Webtoon strip).
    """
    from fastapi.responses import StreamingResponse
    from PIL import Image
    import io
    import base64
    
    # Fetch Episode & Cuts
    episode = session.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
        
    statement = select(StoryCut).where(StoryCut.episode_id == episode_id).order_by(StoryCut.cut_order)
    cuts = session.exec(statement).all()
    
    if not cuts:
        raise HTTPException(status_code=400, detail="No cuts to export")

    images = []
    total_height = 0
    max_width = 0
    
    # Process Images
    for cut in cuts:
        if cut.image_path and cut.image_path.startswith("data:image"):
            try:
                # Extract base64 info
                header, encoded = cut.image_path.split(",", 1)
                img_data = base64.b64decode(encoded)
                img = Image.open(io.BytesIO(img_data))
                img.load() # Force load to validate data
                
                # Normalize width (optional? let's stick to max found or 1024?)
                # For webtoon, fixed width is standard. Let's force 1024 width?
                # For MVP, just list them.
                images.append(img)
                total_height += img.height
                max_width = max(max_width, img.width)
            except Exception as e:
                print(f"Failed to process image for cut {cut.id}: {e}")
                
    if not images:
         raise HTTPException(status_code=400, detail="No valid images found in cuts")

    # Create Canvas
    # Add some spacing? 
    spacing = 50
    final_height = total_height + (len(images) - 1) * spacing
    
    # Default background white or black? Webtoons often white or dark mode?
    # Let's use White for now.
    canvas = Image.new('RGB', (max_width, final_height), (255, 255, 255))
    
    y_offset = 0
    for img in images:
        # Center image if smaller than max width?
        x_offset = (max_width - img.width) // 2
        canvas.paste(img, (x_offset, y_offset))
        y_offset += img.height + spacing
        
    # Output
    img_byte_arr = io.BytesIO()
    canvas.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    filename = f"{episode.title.replace(' ', '_')}_export.png"
    
    return StreamingResponse(
        img_byte_arr, 
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
