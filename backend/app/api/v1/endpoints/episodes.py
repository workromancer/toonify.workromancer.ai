from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session, select

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
    use_previous_context: bool = True



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
    story_summary: str = ""
    status: str
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
    
    statement = select(Episode).where(Episode.project_id == project_id).where(Episode.deleted_at == None).order_by(Episode.episode_order)
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


@router.get("/{episode_id}", response_model=EpisodeOut)
def get_episode(
    *,
    session: Session = Depends(deps.get_session),
    episode_id: UUID,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Get episode by ID.
    """
    episode = session.get(Episode, episode_id)
    if not episode or episode.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Episode not found")
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
    if not episode or episode.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Soft delete: set deleted_at
    episode.deleted_at = datetime.utcnow()
    session.add(episode)
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
    statement = select(Episode).where(Episode.project_id == project_id).where(Episode.deleted_at == None).order_by(Episode.episode_order.desc()).limit(3)
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
    background_tasks: BackgroundTasks,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
    accept_language: str = Header("en", alias="Accept-Language")
):
    """
    Generate and save initial cuts (script, dialogue, panel type) asynchronously.
    """
    style = request.style
    if not style:
        project = session.get(Project, request.project_id)
        style = project.style_preset if project else "Webtoon"

    # 1. Create Episode
    # Determine order: max order + 1
    statement = select(Episode).where(Episode.project_id == request.project_id).where(Episode.deleted_at == None).order_by(Episode.episode_order.desc()).limit(1)
    last_ep = session.exec(statement).first()
    new_order = (last_ep.episode_order + 1) if last_ep else 1

    episode = Episode(
        title=request.episode_title,
        story_summary=request.episode_summary,
        project_id=request.project_id,
        episode_order=new_order,
        status="generating"
    )
    session.add(episode)
    session.commit()
    session.refresh(episode)

    # Start Background Task
    background_tasks.add_task(
        generate_episode_cuts_task,
        episode_id=episode.id,
        project_id=request.project_id,
        episode_title=request.episode_title,
        episode_summary=request.episode_summary,
        style=style,
        num_cuts=request.num_cuts,
        language=project.language if project else "en"
    )

    return {
        "episode_id": episode.id,
        "title": episode.title,
        "status": "generating",
        "cuts_count": 0,
        "cuts": []
    }

def generate_episode_cuts_task(
    episode_id: UUID,
    project_id: UUID,
    episode_title: str,
    episode_summary: str,
    style: str,
    num_cuts: int,
    language: str
):
    print(f"Background Task: Generating cuts for episode {episode_id}")
    with Session(engine) as session:
        episode = session.get(Episode, episode_id)
        if not episode: return
        
        # Fetch project characters for AI context
        characters = session.exec(select(Character).where(Character.project_id == project_id).where(Character.deleted_at == None)).all()
        
        char_details = []
        for c in characters:
            personality = c.profile.get("personality") if c.profile else None
            if not personality and c.default_mood:
                personality = ", ".join(c.default_mood)
                
            char_details.append({
                "id": str(c.id),
                "name": c.name,
                "personality": personality,
                "appearance": c.appearance_tags,
                "description": c.description
            })

        # Generate Cuts via AI
        try:
            cuts_data = ai_service.generate_initial_cuts(
                episode_title=episode_title,
                summary=episode_summary,
                style=style,
                num_cuts=num_cuts,
                language=language,
                available_characters=char_details
            )
            
            # Save Cuts
            created_cuts = []
            for cut_item in cuts_data:
                story_cut = StoryCut(
                    episode_id=episode.id,
                    cut_order=cut_item.get("cut_order", 1),
                    script=cut_item.get("script", ""),
                    selected_layout=cut_item.get("panel_type", "Square"),
                    aspect_ratio=cut_item.get("panel_type", "1:1"),
                    dialogues=cut_item.get("dialogues", []),
                    appearing_characters=cut_item.get("appearing_characters", []),
                    refer_prev_cut=cut_item.get("refer_prev_cut", True),
                    location=cut_item.get("location"),
                    time_of_day=cut_item.get("time_of_day"),
                    transition_ref=cut_item.get("transition_ref"),
                    image_path=None
                )
                
                # Refine aspect ratio
                ptype = cut_item.get("panel_type", "").lower()
                if ":" in ptype:
                     story_cut.aspect_ratio = ptype
                elif "wide" in ptype:
                    story_cut.aspect_ratio = "16:9"
                elif "vertical" in ptype:
                     story_cut.aspect_ratio = "9:16"
                elif "square" in ptype:
                     story_cut.aspect_ratio = "1:1"
                else:
                    story_cut.aspect_ratio = "1:1"
                    
                session.add(story_cut)
                created_cuts.append(story_cut)
            
            episode.status = "ready"
            session.add(episode)
            session.commit()
            print(f"Task Complete: Generated {len(created_cuts)} cuts for episode {episode_id}")
            
        except Exception as e:
            print(f"AI Cut Gen Failed: {e}")
            episode.status = "failed"
            session.add(episode)
            session.commit()

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
        
    episode = session.get(Episode, cut.episode_id)
    if not episode or episode.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Episode not found")

    # Pass everything needed to background task
    prompt_override = request.prompt_override
    use_previous_context = request.use_previous_context
    
    # Update status to generating
    cut.status = "generating"
    session.add(cut)
    session.commit()
    
    # We need to fetch project language.
    episode = session.get(Episode, cut.episode_id)
    project = session.get(Project, episode.project_id)
    lang = project.language if project else "en"

    background_tasks.add_task(generate_cut_task, cut_id, prompt_override, lang, use_previous_context)
    
    return {"message": "Generation started", "cut_id": cut_id}
    
def generate_cut_task(cut_id: UUID, prompt_override: Optional[str], language: str = "en", use_previous_context: bool = True):
    print(f"Background Task: Generating image for cut {cut_id}, language={language}")
    with Session(engine) as session:
        cut = session.get(StoryCut, cut_id)
        if not cut: return
        
        try:
             # Ensure status is generating if missed
            if cut.status != "generating":
                cut.status = "generating"
                session.add(cut)
                session.commit()

            episode = session.get(Episode, cut.episode_id)
            project = session.get(Project, episode.project_id)
            
            # 1. Context Gathering
            
            # A. Style Reference
            style_ref_url = project.style_reference_url
            if not style_ref_url:
                 pass 
    
            # A2. Episode Global Context
            episode_bg_info = episode.background_info
            episode_char_outfits = episode.character_outfits or {}

            # B. Previous Scene (for continuity)
            prev_scene_url = None
            # Check if reference logic is enabled
            should_refer = use_previous_context and cut.refer_prev_cut
            if should_refer and cut.cut_order > 1:
                prev_cut = session.exec(
                    select(StoryCut)
                    .where(StoryCut.episode_id == cut.episode_id)
                    .where(StoryCut.cut_order == cut.cut_order - 1)
                ).first()
                if prev_cut and prev_cut.image_path:
                    prev_scene_url = prev_cut.image_path
            
            # C. Characters (Max 6)
            # 1. Start with characters explicitly listed for this cut
            raw_appearing = cut.appearing_characters or []
            appearing_names = []
            
            # Initialize with global outfits, then override with specific ones
            char_outfits = episode_char_outfits.copy() 
            
            for item in raw_appearing:
                if isinstance(item, dict):
                    if "name" in item:
                        lower_name = item["name"].lower()
                        appearing_names.append(lower_name)
                        if "clothing" in item and item["clothing"]:
                            char_outfits[lower_name] = item["clothing"]
                elif isinstance(item, str):
                    appearing_names.append(item.lower())

            # 2. Add characters from dialogues
            suggested_names = [d.get("speaker", "").lower() for d in (cut.dialogues or []) if d.get("speaker")]
            appearing_names.extend(suggested_names)
            
            # 3. Deduplicate and filter project characters
            occurring_names = list(set(appearing_names))
            
            # Fetch characters from project
            all_chars = session.exec(select(Character).where(Character.project_id == project.id).where(Character.deleted_at == None)).all()
            
            char_data = []
            char_visuals = []
            # Priority 1: Specifically matched characters
            matched_chars = [c for c in all_chars if c.name.lower() in occurring_names and c.profile_image_url]
            for c in matched_chars[:6]:
                char_data.append({"name": c.name, "url": c.profile_image_url})
                
                # Append visual description for text prompt
                visual_desc_parts = []
                if c.appearance_tags:
                    visual_desc_parts.append(f"Visuals({', '.join(c.appearance_tags)})")
                if c.description:
                    # Truncate description to keep prompt concise
                    desc_short = c.description[:100] + "..." if len(c.description) > 100 else c.description
                    visual_desc_parts.append(f"Traits({desc_short})")
                
                if visual_desc_parts:
                    char_visuals.append(f"{c.name}: {' '.join(visual_desc_parts)}")
                
            # Priority 2: Fallback REMOVED to avoid polluting context with irrelevant characters
            # if len(char_data) < 3: ...
            
            # 2. Prompt Construction
            prompt = prompt_override
            if not prompt:
                dialogue_text = " ".join([f"{d.get('speaker', 'Unknown')}: {d.get('text', '')}" for d in cut.dialogues])
                
                # Construct richer prompt
                setting_info = []
                if cut.location: setting_info.append(f"Location: {cut.location}")
                if cut.time_of_day: setting_info.append(f"Time: {cut.time_of_day}")
                if episode_bg_info: setting_info.append(f"Episode Context: {episode_bg_info}")
                setting_str = ", ".join(setting_info)
                
                outfit_str = ""
                if char_outfits:
                     outfit_list = [f"{name.capitalize()}: {desc}" for name, desc in char_outfits.items()]
                     outfit_str = f"Character Outfits: {', '.join(outfit_list)}"

                char_visuals_str = ""
                if char_visuals:
                    char_visuals_str = "Character Descriptions:\n" + "\n".join([f"- {cv}" for cv in char_visuals])
                     
                transition_str = ""
                if cut.transition_ref:
                     transition_str = f"Transition Note: {cut.transition_ref}"

                prompt = f"""
                Style: {project.style_preset} {f'({project.art_style})' if project.art_style else ''}
                Setting: {setting_str}
                Action/Scene: {cut.script}
                {outfit_str}
                {char_visuals_str}
                Dialogues: {dialogue_text}
                {transition_str}
                """
    
            # 3. Determine Dimensions
            width, height = 1024, 1024
            ratio = cut.aspect_ratio.lower() if cut.aspect_ratio else "square"
            
            if ratio in ["wide", "16:9"]:
                width, height = 1536, 1024 # 3:2
            elif ratio in ["vertical", "9:16"]:
                width, height = 1024, 1536 # 2:3
            
            img_bytes = ai_service.generate_panel_image(
                prompt=prompt,
                width=width,
                height=height,
                aspect_ratio=ratio,
                style_ref_url=style_ref_url,
                character_data=char_data,
                prev_scene_url=prev_scene_url,
                language=language
            )
            
            url = storage.upload_image(img_bytes)
            cut.image_path = url
            cut.status = "completed"
            session.add(cut)
            session.commit()
            print(f"Task Complete: Image saved to {url}")

        except Exception as e:
            print(f"Background Cut Gen Error: {e}")
            cut.status = "failed"
            session.add(cut)
            session.commit()


@router.post("/{episode_id}/export")
def export_episode(
    *,
    session: Session = Depends(deps.get_session),
    episode_id: UUID,
    format: str = "webtoon",
    current_user_id: str = Depends(deps.get_current_user_id),
):
    """
    Export episode as a stitched vertical image (Webtoon strip) or a ZIP of individual images.
    """
    from fastapi.responses import StreamingResponse
    from PIL import Image
    import io
    import base64
    import zipfile
    import requests
    import urllib.parse
    
    # Fetch Episode & Cuts
    episode = session.get(Episode, episode_id)
    if not episode or episode.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Episode not found")
        
    statement = select(StoryCut).where(StoryCut.episode_id == episode_id).order_by(StoryCut.cut_order)
    cuts = session.exec(statement).all()
    
    if not cuts:
        raise HTTPException(status_code=400, detail="No cuts to export")

    # Helper to get image bytes
    def get_image_bytes(image_path: str) -> bytes | None:
        if not image_path:
            return None
        try:
            if image_path.startswith("data:image"):
                header, encoded = image_path.split(",", 1)
                return base64.b64decode(encoded)
            elif image_path.startswith("http"):
                # Fetch from URL (S3/MinIO)
                resp = requests.get(image_path, timeout=10)
                if resp.status_code == 200:
                    return resp.content
            return None
        except Exception as e:
            print(f"Failed to fetch image: {e}")
            return None

    if format == "zip":
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            file_count = 0
            for cut in cuts:
                if not cut.image_path:
                    continue
                    
                img_data = get_image_bytes(cut.image_path)
                if img_data:
                    # Naming: EpisodeTitle_CutNumber.png
                    # Sanitize title
                    safe_title = "".join(c for c in episode.title if c.isalnum() or c in (' ', '_', '-')).strip().replace(" ", "_")
                    filename = f"{safe_title}_{cut.cut_order:02d}.png"
                    zf.writestr(filename, img_data)
                    file_count += 1
            
        if file_count == 0:
             raise HTTPException(status_code=400, detail="No valid images found to zip")
             
        zip_buffer.seek(0)
        zip_filename = f"{episode.title.replace(' ', '_')}_cuts.zip"
        encoded_zip_filename = urllib.parse.quote(zip_filename)
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_zip_filename}"}
        )

    # ... Webtoon Strip Logic (Legacy support for data-uri only primarily?) ...
    # Updating this to use the new get_image_bytes helper for consistency if generic URLs are used too
    
    images = []
    total_height = 0
    max_width = 0
    
    # Process Images
    for cut in cuts:
        img_data = get_image_bytes(cut.image_path)
        if img_data:
            try:
                img = Image.open(io.BytesIO(img_data))
                img.load()
                images.append(img)
                total_height += img.height
                max_width = max(max_width, img.width)
            except Exception as e:
                print(f"Failed to process image for cut {cut.id}: {e}")
                
    if not images:
         raise HTTPException(status_code=400, detail="No valid images found in cuts")

    # Create Canvas
    spacing = 50
    final_height = total_height + (len(images) - 1) * spacing
    
    canvas = Image.new('RGB', (max_width, final_height), (255, 255, 255))
    
    y_offset = 0
    for img in images:
        x_offset = (max_width - img.width) // 2
        canvas.paste(img, (x_offset, y_offset))
        y_offset += img.height + spacing
        
    # Output
    img_byte_arr = io.BytesIO()
    canvas.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    filename = f"{episode.title.replace(' ', '_')}_export.png"
    encoded_filename = urllib.parse.quote(filename)
    
    return StreamingResponse(
        img_byte_arr, 
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )
