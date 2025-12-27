"""
Episode Background Tasks
Cut generation, image generation, and sequential processing tasks.
"""
from typing import Optional
from uuid import UUID
from sqlmodel import Session, select

from app.core.logging import get_logger
from app.db.engine import engine
from app.models import Episode, Project, Character, StoryCut
from app.services.ai import ai_service
from app.services.storage import storage

logger = get_logger(__name__)


def generate_episode_cuts_task(
    episode_id: UUID,
    project_id: UUID,
    episode_title: str,
    episode_summary: str,
    style: str,
    num_cuts: int,
    language: str
):
    """Background task to generate initial cuts (script, dialogue, panel type) for an episode."""
    logger.info("Background task: Generating cuts for episode", episode_id=str(episode_id))
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
            logger.info("Task complete: Generated cuts for episode", episode_id=str(episode_id), count=len(created_cuts))
            
            # Note: Automatic image generation triggering removed per user request.
            # Images will be generated manually or via 'Generate All' in frontend.
            
        except Exception as e:
            logger.error("Error generating cuts", episode_id=str(episode_id), error=str(e))
            episode.status = "failed"
            session.add(episode)
            session.commit()


def generate_cut_task(cut_id: UUID, prompt_override: Optional[str], language: str = "en", use_previous_context: bool = True, prev_image_url_override: str = None) -> str | None:
    """Background task to generate image for a single story cut."""
    logger.info("Background task: Generating image for cut", cut_id=str(cut_id), language=language)
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
            
            logger.info("Task complete: Generated image for cut", cut_id=str(cut_id), url=url)
            return url

        except Exception as e:
            logger.error("Cut gen failed", cut_id=str(cut_id), error=str(e))
            cut.status = "failed"
            session.add(cut)
            session.commit()
            return None


def generate_episode_images_sequentially(episode_id: UUID):
    """Background task to generate images for all cuts in an episode sequentially."""
    logger.info("Background task: Starting sequential image generation for episode", episode_id=str(episode_id))
    try:
        with Session(engine) as session:
            # Fetch cuts
            cuts = session.exec(select(StoryCut).where(StoryCut.episode_id == episode_id).order_by(StoryCut.cut_order)).all()
            
            for cut in cuts:
                 # Check if image already exists
                if cut.image_path:
                    logger.debug("Skipping cut (already exists)", cut_order=cut.cut_order)
                    continue

                logger.debug("Sequentially generating cut", cut_order=cut.cut_order)
                
                # Call generation task (synchronously)
                # This function handles its own DB session for the cut update, 
                # but we are calling it directly.
                generate_cut_task(cut.id, prompt_override=None, language="en", use_previous_context=True)

            # After loop finishes, update episode status to 'ready'
            logger.info("Sequential generation finished for episode", episode_id=str(episode_id))
            episode = session.get(Episode, episode_id)
            if episode:
                episode.status = "ready"
                session.add(episode)
                session.commit()
                
    except Exception as e:
        logger.error("Sequential generation error", episode_id=str(episode_id), error=str(e))
        # Ensure status is reset even on error
        with Session(engine) as session:
             episode = session.get(Episode, episode_id)
             if episode:
                 episode.status = "ready" # Or 'failed'
                 session.add(episode)
                 session.commit()
