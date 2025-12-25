from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session, select

from app.api import deps
from app.core.config import settings
from app.models import Episode, Project, WorkspaceMember, StoryCut, Character, EpisodeSuggestion
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
    status: str
    created_at: datetime
    
    # Context
    background_info: Optional[str] = None
    character_outfits: Optional[dict] = None
    
    # First cut thumbnail
    first_cut_image: Optional[str] = None

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
    
    # Fetch first cut image for each episode
    result = []
    for ep in episodes:
        first_cut = session.exec(
            select(StoryCut)
            .where(StoryCut.episode_id == ep.id)
            .where(StoryCut.image_path != None)
            .order_by(StoryCut.cut_order)
            .limit(1)
        ).first()
        
        # Build first_cut_image URL
        first_cut_image_url = None
        if first_cut and first_cut.image_path:
            path = first_cut.image_path
            if path.startswith("http://") or path.startswith("https://"):
                first_cut_image_url = path
            elif settings.STORAGE_HOST:
                first_cut_image_url = f"{settings.STORAGE_HOST}/{path}"
            else:
                first_cut_image_url = path
        
        ep_dict = {
            "id": ep.id,
            "title": ep.title,
            "episode_order": ep.episode_order,
            "project_id": ep.project_id,
            "story_summary": ep.story_summary or "",
            "status": ep.status,
            "created_at": ep.created_at,
            "background_info": ep.background_info,
            "character_outfits": ep.character_outfits,
            "first_cut_image": first_cut_image_url
        }
        result.append(ep_dict)
    
    return result

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

class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    story_summary: Optional[str] = None
    background_info: Optional[str] = None
    character_outfits: Optional[dict] = None

@router.put("/{episode_id}", response_model=EpisodeOut)
def update_episode(
    *,
    session: Session = Depends(deps.get_session),
    episode_id: UUID,
    episode_in: EpisodeUpdate,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Update an episode.
    """
    episode = session.get(Episode, episode_id)
    if not episode or episode.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    if episode_in.title is not None:
        episode.title = episode_in.title
    if episode_in.story_summary is not None:
        episode.story_summary = episode_in.story_summary
    if episode_in.background_info is not None:
        episode.background_info = episode_in.background_info
    if episode_in.character_outfits is not None:
        episode.character_outfits = episode_in.character_outfits
        
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
    if not episode or episode.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Soft delete: set deleted_at
    episode.deleted_at = datetime.utcnow()
    session.add(episode)
    session.commit()
    
    from fastapi import Response
    return Response(status_code=204)

# Episode Suggestions CRUD
class EpisodeSuggestionOut(BaseModel):
    id: UUID
    title: str
    summary: str
    reason: Optional[str] = None
    user_instruction: Optional[str] = None
    is_used: bool
    created_at: datetime

@router.get("/suggestions/{project_id}", response_model=List[EpisodeSuggestionOut])
def list_episode_suggestions(
    *,
    project_id: UUID,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
):
    """List all episode suggestions for a project."""
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    statement = select(EpisodeSuggestion).where(
        EpisodeSuggestion.project_id == project_id
    ).where(
        EpisodeSuggestion.deleted_at == None
    ).order_by(EpisodeSuggestion.created_at.desc())
    
    return session.exec(statement).all()

@router.delete("/suggestions/{suggestion_id}")
def delete_episode_suggestion(
    *,
    suggestion_id: UUID,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
):
    """Soft delete an episode suggestion."""
    suggestion = session.get(EpisodeSuggestion, suggestion_id)
    if not suggestion or suggestion.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    suggestion.deleted_at = datetime.utcnow()
    session.add(suggestion)
    session.commit()
    
    from fastapi import Response
    return Response(status_code=204)

@router.post("/generate-options")
def generate_episode_options(
    *,
    project_id: UUID,
    user_instruction: str = None,
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
    accept_language: str = Header("en", alias="Accept-Language")
):
    """
    Generate 3 episode ideas based on project context and save to DB.
    """
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch recent episodes for context
    statement = select(Episode).where(Episode.project_id == project_id).where(Episode.deleted_at == None).order_by(Episode.episode_order.desc()).limit(3)
    episodes = session.exec(statement).all()
    episodes.reverse()
    recent_summaries = "\n".join([f"Ep {ep.episode_order} - {ep.title}: {ep.story_summary}" for ep in episodes])

    worldview_str = json.dumps(project.worldview) if project.worldview else ""

    result = ai_service.generate_episode_ideas(
        project_title=project.title,
        worldview=worldview_str,
        recent_episodes=recent_summaries,
        language=project.language or accept_language.split(',')[0].strip()[:2],
        user_instruction=user_instruction
    )
    
    # Save generated ideas to DB
    saved_suggestions = []
    if result and "options" in result:
        for opt in result["options"]:
            suggestion = EpisodeSuggestion(
                project_id=project_id,
                title=opt.get("title", ""),
                summary=opt.get("summary", ""),
                reason=opt.get("reason"),
                user_instruction=user_instruction
            )
            session.add(suggestion)
            saved_suggestions.append(suggestion)
        session.commit()
        
        # Refresh to get IDs and created_at
        for s in saved_suggestions:
            session.refresh(s)
        
        # Return with IDs
        result["options"] = [
            {
                "id": str(s.id),
                "title": s.title,
                "summary": s.summary,
                "reason": s.reason,
                "created_at": s.created_at.isoformat()
            }
            for s in saved_suggestions
        ]
    
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
        
        # Fetch Project for Worldview/Context
        project = session.get(Project, project_id)
        project_context = {}
        if project:
            genres = [g.name for g in project.genres] if project.genres else []
            project_context = {
                "title": project.title,
                "genres": genres, 
                "worldview": project.worldview or {},
                "art_style": project.art_style or project.style_preset
            }

        # Fetch project characters for AI context
        characters = session.exec(select(Character).where(Character.project_id == project_id).where(Character.deleted_at == None)).all()
        
        char_details = []
        for c in characters:
            personality = c.profile.get("personality") if c.profile else None
            # ... existing character logic ...
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
            response_data = ai_service.generate_initial_cuts(
                episode_title=episode_title,
                summary=episode_summary,
                style=style,
                num_cuts=num_cuts,
                language=language,
                available_characters=char_details,
                project_context=project_context
            )
            
            # Save Episode Context (Background & Outfits)
            if isinstance(response_data, dict):
                episode.background_info = response_data.get("background_info")
                episode.character_outfits = response_data.get("character_outfits")
                cuts_list = response_data.get("cuts", [])
            else:
                 # Fallback for legacy behavior if AI returns list
                cuts_list = response_data
                
            session.add(episode)

            # Save Cuts
            created_cuts = []
            for cut_item in cuts_list:
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
            
            # Note: Automatic image generation triggering removed per user request.
            # Images will be generated manually or via 'Generate All' in frontend.
            
        except Exception as e:
            print(f"Error generating cuts: {e}")
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
    
def generate_cut_task(cut_id: UUID, prompt_override: Optional[str], language: str = "en", use_previous_context: bool = True, prev_image_url_override: str = None) -> str | None:
    print(f"Background Task: Generating image for cut {cut_id}, language={language}")
    with Session(engine) as session:
        cut = session.get(StoryCut, cut_id)
        if not cut: return None
        
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
            prev_scene_url = prev_image_url_override # Priority to override
            
            # Check if reference logic is enabled
            should_refer = use_previous_context and cut.refer_prev_cut
            
            # If no override provided, look up in DB
            if not prev_scene_url and should_refer and cut.cut_order > 1:
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

            # Identify characters who already appeared in previous cuts
            prev_cuts = session.exec(select(StoryCut).where(StoryCut.episode_id == cut.episode_id).where(StoryCut.cut_order < cut.cut_order)).all()
            prev_appearing_names = set()
            for pc in prev_cuts:
                # Extract names from appearing_characters (list of dicts or strings)
                if pc.appearing_characters:
                     for item in pc.appearing_characters:
                        if isinstance(item, dict) and "name" in item:
                            prev_appearing_names.add(item["name"].lower())
                        elif isinstance(item, str):
                            prev_appearing_names.add(item.lower())
                # Also from dialogues
                if pc.dialogues:
                    for d in pc.dialogues:
                         if isinstance(d, dict) and d.get("speaker"):
                             prev_appearing_names.add(d["speaker"].lower())

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
                
                # Only add text description if character is NEW to the episode (First Appearance)
                # to avoid repetitive naming which can cause text artifacts (name tags) in images.
                is_first_appearance = c.name.lower() not in prev_appearing_names
                
                if is_first_appearance and visual_desc_parts:
                    char_visuals.append(f"{c.name}: {' '.join(visual_desc_parts)}")
                
            # Priority 2: Fallback REMOVED to avoid polluting context with irrelevant characters
            # if len(char_data) < 3: ...
            
            # 2. Prompt Construction
            
            # Common Context Components
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
                # Use narrative descriptions instead of Name: Label to avoid text bleeding
                # Format: "Character [Name] appearance: [Desc]" 
                char_visuals_str = "Character Descriptions:\n" + "\n".join([f"- {cv}" for cv in char_visuals])
                 
            transition_str = ""
            if cut.transition_ref:
                 transition_str = f"Transition Note: {cut.transition_ref}"

            # Worldview Context
            worldview_context = ""
            if project.worldview:
                wv_items = [f"{k}: {v}" for k, v in project.worldview.items()]
                if wv_items:
                    worldview_context = "Worldview/Context: " + ", ".join(wv_items)

            # Determine Scene Action (Unified Logic)
            # If prompt_override is provided (Regenerate with custom text), use it as the main instruction
            # Otherwise use the cut script and dialogues
            
            scene_instruction = ""
            if prompt_override:
                scene_instruction = f"User Instruction/Action: {prompt_override}"
            else:
                dialogue_parts = []
                for d in cut.dialogues:
                    speaker = d.get('speaker', 'Unknown')
                    text = d.get('text', '')
                    dtype = d.get('type', 'speech')
                    
                    # Legacy fallback
                    if "(속마음)" in text or "(thought)" in text:
                         text = text.replace("(속마음)", "").replace("(thought)", "").strip()
                         dtype = 'thought'
                    
                    if dtype == 'thought':
                        dialogue_parts.append(f"{speaker} (Thinking): {text}")
                    elif dtype == 'shout':
                         dialogue_parts.append(f"{speaker} (Shouting): {text}")
                    else:
                        dialogue_parts.append(f"{speaker}: {text}")
                dialogue_text = " ".join(dialogue_parts)
                
                scene_instruction = f"""
                Action/Scene: {cut.script}
                Dialogues: {dialogue_text}
                """

            prompt = f"""
            Style: {project.style_preset} {f'({project.art_style})' if project.art_style else ''}
            {worldview_context}
            Setting: {setting_str}
            
            {scene_instruction}
            
            {outfit_str}
            {char_visuals_str}
            {transition_str}
            
            IMPORTANT INSTRUCTIONS:
            1. STRICTLY follow the specified art style ({project.style_preset}{f' - {project.art_style}' if project.art_style else ''}). Draw consistently in that visual style throughout.
            2. Panel borders/frames should ONLY be included when dramatically necessary for storytelling effect. Otherwise, draw without borders.
            3. Do NOT include Name Tags, Character Labels, or Watermarks. Speech bubbles representing dialogue are allowed, but do NOT include specific character names as labels next to characters.
            """
    
            # 3. Determine Dimensions
            width, height = 1024, 1024
            ratio = cut.aspect_ratio.lower() if cut.aspect_ratio else "square"
            
            if ratio in ["wide", "16:9"]:
                width, height = 1536, 1024 # 3:2
            elif ratio in ["vertical", "9:16"]:
                width, height = 1024, 1536 # 2:3
            
            # Using generate_panel_image which now supports prev_scene_url and art_style
            # Combine style_preset and art_style for complete style instruction
            combined_art_style = project.art_style or project.style_preset
            if project.art_style and project.style_preset:
                combined_art_style = f"{project.style_preset} - {project.art_style}"
            
            img_bytes = ai_service.generate_panel_image(
                prompt=prompt,
                width=width,
                height=height,
                aspect_ratio=ratio,
                style_ref_url=style_ref_url,
                character_data=char_data,
                prev_scene_url=prev_scene_url,
                language=language,
                art_style=combined_art_style
            )
            
            url = storage.upload_image(img_bytes, schema="cuts", identifier=str(cut_id))
            cut.image_path = url

            # Update status to completed
            cut.status = "completed"
            session.add(cut)
            session.commit()
            
            print(f"Task Complete: Generated image for cut {cut_id} -> {url}")
            return url

        except Exception as e:
            print(f"Cut Gen Failed: {e}")
            cut.status = "failed"
            session.add(cut)
            session.commit()
            return None

def generate_episode_images_sequentially(episode_id: UUID):
    print(f"Background Task: Starting sequential image generation for episode {episode_id}")
    try:
        with Session(engine) as session:
            # Fetch cuts
            cuts = session.exec(select(StoryCut).where(StoryCut.episode_id == episode_id).order_by(StoryCut.cut_order)).all()
            
            for cut in cuts:
                 # Check if image already exists
                if cut.image_path:
                    print(f"Skipping cut {cut.cut_order} (already exists)")
                    continue

                print(f"Sequentially generating cut {cut.cut_order}")
                
                # Call generation task (synchronously)
                # This function handles its own DB session for the cut update, 
                # but we are calling it directly.
                generate_cut_task(cut.id, prompt_override=None, language="en", use_previous_context=True)

            # After loop finishes, update episode status to 'ready'
            print(f"Sequential generation finished for episode {episode_id}")
            episode = session.get(Episode, episode_id)
            if episode:
                episode.status = "ready"
                session.add(episode)
                session.commit()
                
    except Exception as e:
        print(f"Sequential Generation Error: {e}")
        # Ensure status is reset even on error
        with Session(engine) as session:
             episode = session.get(Episode, episode_id)
             if episode:
                 episode.status = "ready" # Or 'failed'
                 session.add(episode)
                 session.commit()


@router.post("/{episode_id}/generate-images")
def generate_episode_images(
    *,
    session: Session = Depends(deps.get_session),
    episode_id: UUID,
    background_tasks: BackgroundTasks,
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Trigger sequential image generation for all cuts in the episode (Skip existing).
    """
    episode = session.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
        
    # Set status to generating?
    episode.status = "generating"
    session.add(episode)
    session.commit()
    
    background_tasks.add_task(generate_episode_images_sequentially, episode_id)
    
    return {"message": "Sequential generation started"}


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
    from app.core.config import settings
    
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
            
            url = image_path
            if not url.startswith("http"):
                 # Prepend STORAGE_HOST if relative
                 url = f"{settings.STORAGE_HOST}/{image_path}"
                 
            # Fetch from URL (S3/MinIO)
            # Use Verify=False if using self-signed or internal minio without valid certs might be needed, but sticking to standard
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                return resp.content
            return None
        except Exception as e:
            print(f"Failed to fetch image: {e}")
            return None

    if format == "zip":
        print(f"[ZIP Export] Starting ZIP creation for episode: {episode.title}")
        print(f"[ZIP Export] Total cuts: {len(cuts)}")
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            file_count = 0
            for cut in cuts:
                print(f"[ZIP Export] Processing cut {cut.cut_order}, image_path: {cut.image_path[:50] if cut.image_path else 'None'}...")
                if not cut.image_path:
                    print(f"[ZIP Export] Skipping cut {cut.cut_order} - no image_path")
                    continue
                    
                img_data = get_image_bytes(cut.image_path)
                if img_data:
                    # Naming: EpisodeTitle_CutNumber.png
                    # Sanitize title
                    safe_title = "".join(c for c in episode.title if c.isalnum() or c in (' ', '_', '-')).strip().replace(" ", "_")
                    filename = f"{safe_title}_{cut.cut_order:02d}.png"
                    zf.writestr(filename, img_data)
                    file_count += 1
                    print(f"[ZIP Export] Added {filename} ({len(img_data)} bytes)")
                else:
                    print(f"[ZIP Export] Failed to get image data for cut {cut.cut_order}")
            
        print(f"[ZIP Export] ZIP file count: {file_count}")
        
        if file_count == 0:
             raise HTTPException(status_code=400, detail="No valid images found to zip")
        
        # Ensure ZIP is fully written
        zip_buffer.seek(0)
        zip_content = zip_buffer.getvalue()
        print(f"[ZIP Export] Final ZIP size: {len(zip_content)} bytes")
        
        zip_filename = f"{episode.title.replace(' ', '_')}_cuts.zip"
        encoded_zip_filename = urllib.parse.quote(zip_filename)
        
        # Use Response instead of StreamingResponse to ensure complete ZIP is sent
        from fastapi import Response
        return Response(
            content=zip_content,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_zip_filename}"}
        )

    # ... Webtoon Strip Logic ...
    # All images will be resized to match max_width for consistent strip
    
    raw_images = []
    max_width = 0
    
    # First pass: Load images and find max width
    for cut in cuts:
        img_data = get_image_bytes(cut.image_path)
        if img_data:
            try:
                img = Image.open(io.BytesIO(img_data))
                img.load()
                raw_images.append(img)
                max_width = max(max_width, img.width)
            except Exception as e:
                print(f"Failed to process image for cut {cut.id}: {e}")
                
    if not raw_images:
         raise HTTPException(status_code=400, detail="No valid images found in cuts")

    # Second pass: Resize all images to max_width while preserving aspect ratio
    resized_images = []
    total_height = 0
    
    for img in raw_images:
        if img.width != max_width:
            # Calculate new height preserving aspect ratio
            new_height = int(img.height * (max_width / img.width))
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
        resized_images.append(img)
        total_height += img.height

    # Create Canvas
    spacing = 50
    final_height = total_height + (len(resized_images) - 1) * spacing
    
    canvas = Image.new('RGB', (max_width, final_height), (255, 255, 255))
    
    y_offset = 0
    for img in resized_images:
        canvas.paste(img, (0, y_offset))
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
