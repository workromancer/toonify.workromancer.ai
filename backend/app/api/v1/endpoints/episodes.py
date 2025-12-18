from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlmodel import Session, select, col

from app.api import deps
from app.models import Episode, Project, WorkspaceMember, StoryCut, Character
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from uuid import UUID
import json
from app.services.ai import ai_service
from app.services.storage import storage
from fastapi import BackgroundTasks
from app.db.engine import engine # Need engine for background task session


router = APIRouter()

class GenerateCutsRequest(BaseModel):
    project_id: UUID
    episode_title: str
    episode_summary: str
    style: Optional[str] = None
    num_cuts: int = 6

class GenerateImageRequest(BaseModel):
    prompt_override: Optional[str] = None



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

@router.get("", response_model=List[EpisodeOut])
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

@router.post("", response_model=EpisodeOut)
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

@router.post("/generate-options")
def generate_episode_options(
    *,
    project_id: UUID,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
    accept_language: str = Header("en", alias="Accept-Language")
):
    """
    Generate 3 episode ideas based on project context.
    """
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch recent episodes for context
    statement = select(Episode).where(Episode.project_id == project_id).order_by(Episode.episode_order.desc()).limit(3)
    episodes = session.exec(statement).all()
    # Reverse to chronological
    episodes.reverse()
    recent_summaries = "\n".join([f"{ep.title}: {ep.story_summary}" for ep in episodes])

    worldview_str = json.dumps(project.worldview) if project.worldview else ""

    result = ai_service.generate_episode_ideas(
        project_title=project.title,
        worldview=worldview_str,
        recent_episodes=recent_summaries,
        language=project.language or accept_language.split(',')[0].strip()[:2]
    )
    return result

@router.post("/generate-cuts")
def generate_episode_cuts(
    *,
    request: GenerateCutsRequest,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
    accept_language: str = Header("en", alias="Accept-Language")
):
    """
    Generate and save initial cuts (script, dialogue, panel type).
    """
    style = request.style
    if not style:
        project = session.get(Project, request.project_id)
        style = project.style_preset if project else "Webtoon"

    # 1. Create Episode
    # Determine order: max order + 1
    statement = select(Episode).where(Episode.project_id == request.project_id).order_by(Episode.episode_order.desc()).limit(1)
    last_ep = session.exec(statement).first()
    new_order = (last_ep.episode_order + 1) if last_ep else 1

    episode = Episode(
        title=request.episode_title,
        story_summary=request.episode_summary,
        project_id=request.project_id,
        episode_order=new_order
    )
    session.add(episode)
    session.commit()
    session.refresh(episode)

    # Fetch project language
    project = session.get(Project, request.project_id)
    project_lang = project.language if project else "en"

    # 2. Generate Cuts via AI
    try:
        cuts_data = ai_service.generate_initial_cuts(
            episode_title=request.episode_title,
            summary=request.episode_summary,
            style=style,
            num_cuts=request.num_cuts,
            language=project_lang
        )
    except Exception as e:
        # If AI fails, we might still want the episode? Or rollback?
        # Let's keep episode but empty cuts.
        print(f"AI Cut Gen Failed: {e}")
        cuts_data = []

    # 3. Save Cuts
    created_cuts = []
    for cut_item in cuts_data:
        # cut_item has keys: cut_order, script, dialogues, panel_type
        # mapping cut_item keys to StoryCut model
        # dialogues is list of dict, compatible with JSON column
        
        story_cut = StoryCut(
            episode_id=episode.id,
            cut_order=cut_item.get("cut_order", 1),
            script=cut_item.get("script", ""),
            selected_layout=cut_item.get("panel_type", "Square"), # Mapping panel_type to layout?
            aspect_ratio=cut_item.get("panel_type", "1:1"), # Simplified mapping
            dialogues=cut_item.get("dialogues", []),
            appearing_characters=cut_item.get("appearing_characters", []),
            image_path=None
        )
        
        # Refine aspect ratio based on panel type
        ptype = cut_item.get("panel_type", "").lower()
        if "wide" in ptype:
            story_cut.aspect_ratio = "Wide"
        elif "vertical" in ptype:
            story_cut.aspect_ratio = "Vertical"
        else:
            story_cut.aspect_ratio = "Square"
            
        session.add(story_cut)
        created_cuts.append(story_cut)
        
    session.commit()
    
    return {
        "episode_id": episode.id,
        "title": episode.title,
        "cuts_count": len(created_cuts),
        "cuts": created_cuts
    }

@router.post("/{episode_id}/cuts/{cut_id}/generate-image")
def generate_cut_image(
    *,
    episode_id: UUID,
    cut_id: UUID,
    request: GenerateImageRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
    accept_language: str = Header("en", alias="Accept-Language")
):
    """
    Start background image generation for a specific cut.
    """
    cut = session.get(StoryCut, cut_id)
    if not cut:
        raise HTTPException(status_code=404, detail="Cut not found")

    # Pass everything needed to background task
    prompt_override = request.prompt_override
    
    prompt_override = request.prompt_override
    
    # We need to fetch project language. Pass None here and let background task fetch it or fetch here?
    # Background task fetches project again. Let's pass language argument to task.
    # But current task signature takes language.
    # Background task `generate_cut_task` fetches project.
    
    # Let's simple pass None and let background task determine language from project?
    # Or fetch cut -> project here?
    # cut is fetched above.
    episode = session.get(Episode, cut.episode_id)
    project = session.get(Project, episode.project_id)
    lang = project.language if project else "en"

    background_tasks.add_task(generate_cut_task, cut_id, prompt_override, lang)
    
    return {"message": "Generation started", "cut_id": cut_id}
    
def generate_cut_task(cut_id: UUID, prompt_override: Optional[str], language: str = "en"):
    print(f"Background Task: Generating image for cut {cut_id}, language={language}")
    with Session(engine) as session:
        cut = session.get(StoryCut, cut_id)
        if not cut: return
        
        episode = session.get(Episode, cut.episode_id)
        project = session.get(Project, episode.project_id)
        
        # 1. Context Gathering
        
        # A. Style Reference
        style_ref_url = project.style_reference_url
        if not style_ref_url and project.projects: # Just in case data model is weird, but typically project.style_reference_url is correct
             pass 

        # B. Previous Scene (for continuity)
        prev_scene_url = None
        if cut.cut_order > 1:
            prev_cut = session.exec(
                select(StoryCut)
                .where(StoryCut.episode_id == cut.episode_id)
                .where(StoryCut.cut_order == cut.cut_order - 1)
            ).first()
            if prev_cut and prev_cut.image_path:
                prev_scene_url = prev_cut.image_path
        
        # C. Characters (Max 6)
        # 1. Start with characters explicitly listed for this cut
        appearing_names = [name.lower() for name in (cut.appearing_characters or [])]
        
        # 2. Add characters from dialogues
        suggested_names = [d.get("speaker", "").lower() for d in (cut.dialogues or []) if d.get("speaker")]
        appearing_names.extend(suggested_names)
        
        # 3. Deduplicate and filter project characters
        occurring_names = list(set(appearing_names))
        
        # Fetch characters from project
        all_chars = session.exec(select(Character).where(Character.project_id == project.id)).all()
        
        char_data = []
        # Priority 1: Specifically matched characters
        matched_chars = [c for c in all_chars if c.name.lower() in occurring_names and c.profile_image_url]
        for c in matched_chars[:6]:
            char_data.append({"name": c.name, "url": c.profile_image_url})
            
        # Priority 2: Fallback to any project characters if less than 6 found and we need context
        # But maybe better to be strict? Let's add up to 3 more from the project if none matched.
        if len(char_data) < 3:
            remaining_chars = [c for c in all_chars if c.id not in [mc.id for mc in matched_chars] and c.profile_image_url]
            for c in remaining_chars[:(6 - len(char_data))]:
                char_data.append({"name": c.name, "url": c.profile_image_url})
        
        # 2. Prompt Construction
        prompt = prompt_override
        if not prompt:
            dialogue_text = " ".join([f"{d.get('speaker', 'Unknown')}: {d.get('text', '')}" for d in cut.dialogues])
            prompt = f"""
            Style: {project.style_preset} {f'({project.art_style})' if project.art_style else ''}
            Action/Scene: {cut.script}
            Dialogues: {dialogue_text}
            """

        # 3. Determine Dimensions
        width, height = 1024, 1024
        if cut.aspect_ratio == "Wide":
            width, height = 1536, 1024 # 3:2
        elif cut.aspect_ratio == "Vertical":
            width, height = 1024, 1536 # 2:3
        
        try:
            img_bytes = ai_service.generate_panel_image(
                prompt=prompt,
                width=width,
                height=height,
                style_ref_url=style_ref_url,
                character_data=char_data,
                prev_scene_url=prev_scene_url,
                language=language
            )
            
            url = storage.upload_image(img_bytes)
            cut.image_path = url
            session.add(cut)
            session.commit()
            print(f"Task Complete: Image saved to {url}")
            
        except Exception as e:
            print(f"Background Cut Gen Error: {e}")
            # Could update cut status to 'failed' if we had a status field


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
