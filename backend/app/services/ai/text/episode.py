"""
Episode AI Service - 에피소드 및 컷 생성
"""
from google.genai import types
import json
from typing import List, Optional

from app.services.ai.base import BaseAIService


class EpisodeAIService(BaseAIService):
    """에피소드/컷 관련 AI 기능"""
    
    def generate_direction_options(
        self, 
        script: str, 
        character_context: str = "", 
        language: str = "en"
    ) -> dict:
        """연출 옵션 생성 (3가지 방향)"""
        self._ensure_client()

        prompt = f"""
        You are a professional webtoon director. 
        Analyze the following script and suggest 3 distinct visual direction options (camera angle, composition, mood).
        
        Script: "{script}"
        
        {f'Ensure the visual description includes the following character details if relevant: {character_context}' if character_context else ''}
        
        {f'IMPORTANT: All output text (labels, descriptions) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        Return ONLY a JSON object with the following structure:
        {{
            "options": [
                {{
                    "id": "A",
                    "label": "Short Title (e.g., Low Angle)",
                    "description": "Brief description of the visual composition.",
                    "aspect_ratio": "3:4", 
                    "image_prompt": "Detailed image generation prompt for this scene including character visual details..."
                }},
                ...
            ]
        }}
        """
        
        try:
            print(f"DEBUG PROMPT [generate_direction_options]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["director"],
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text)
            
        except Exception as e:
            print(f"Director AI Error: {e}")
            raise e
    
    def generate_episode_ideas(
        self, 
        project_title: str, 
        worldview: str, 
        recent_episodes: str, 
        language: str = "en", 
        user_instruction: str = None
    ) -> dict:
        """에피소드 아이디어 생성 (3개 제안)"""
        self._ensure_client()
             
        prompt = f"""
        You are a professional webtoon writer.
        Your task is to propose the NEXT 3 possible episode ideas that logically continue the story.

        # Project Context
        Title: {project_title}
        Worldview: {worldview}

        # Story So Far (Recent Episodes)
        {recent_episodes}

        {f'# User Instruction: {user_instruction}' if user_instruction else ''}

        {f'IMPORTANT: All output text (titles, summaries, reasons) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        # Instructions
        1. Analyze the narrative flow of the recent episodes.
        2. Propose 3 distinct directions for the *immediately following* episode.
        3. Ensure continuity: The new episodes must logically succeed the incidents in the last episode.
        4. Advance the plot or deepen character relationships based on established context.

        Return ONLY a JSON object with the following structure:
        {{
            "options": [
                {{
                    "title": "Title",
                    "summary": "Detailed summary of the episode events.",
                    "reason": "Explanation of how this connects to the previous plot and why it's a good next step."
                }},
                ...
            ]
        }}
        """
        try:
            print(f"DEBUG PROMPT [generate_episode_ideas]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["director"],
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Episode Idea Gen Failed: {e}")
            raise e
    
    def generate_initial_cuts(
        self, 
        episode_title: str, 
        summary: str, 
        style: str, 
        num_cuts: int = 6, 
        language: str = "en",
        available_characters: List[dict] = None,
        project_context: dict = None
    ) -> dict:
        """초기 컷 스크립트 생성"""
        self._ensure_client()
        
        available_characters = available_characters or []

        # Format available characters
        chars_str = "None"
        if available_characters:
            chars_list = []
            for char in available_characters:
                c_info = f"- Name: {char.get('name')}\n"
                c_info += f"  ID: {char.get('id')}\n"
                if char.get('personality'):
                    c_info += f"  Personality: {char.get('personality')}\n"
                if char.get('appearance'):
                    app = char.get('appearance')
                    if isinstance(app, list):
                        app = ", ".join(app)
                    c_info += f"  Appearance: {app}\n"
                if char.get('description'):
                    c_info += f"  Description: {char.get('description')}\n"
                chars_list.append(c_info)
            chars_str = "\n".join(chars_list)

        project_info_str = ""
        if project_context:
            worldview = project_context.get("worldview", {})
            worldview_str = "\n".join([f"- {k}: {v}" for k, v in worldview.items()]) if worldview else "None"
            project_info_str = f"""
        Project Context:
        Title: {project_context.get("title")}
        Genres: {', '.join(project_context.get("genres", []))}
        Art Style: {project_context.get("art_style")}
        Worldview/Setting:
        {worldview_str}
            """

        prompt = f"""
        Plan a {num_cuts}-cut webtoon episode.
        
        {project_info_str}
        
        Episode Details:
        Title: {episode_title}
        Summary: {summary}
        Style: {style}
        
        Available Characters:
        {chars_str}
        
        Task:
        1. Define the overall **Background/Setting** for the episode (e.g. "Inside a cozy cafe, raining outside").
        2. Define the **Outfit** for each character appearing in this episode. Ensure consistency.
        3. Create {num_cuts} cuts.
        
        For each cut, determine:
        - Script (Visual Description of action/scene). Do NOT repeat character names excessively. Mention the full name only when the character appears for the FIRST time in the context or if ambiguous; otherwise use pronouns (he/she) or generic terms.
        - Location (Setting name, e.g. "School Classroom")
        - Time of Day (e.g. "Sunset", "Night")
        - Dialogues (List of objects: [{{"speaker": "Name", "type": "speech" | "thought" | "shout", "text": "Content"}}]). 
          - Use "thought" for internal monologues (속마음).
          - Use "shout" for loud/bold text.
          - Use "speech" for normal dialogue.
        - Panel Type (Aspect Ratio...)
        - Appearing Characters (List of objects: [{{"id": "...", "name": "...", "clothing": "..."}}])
        - refer_prev_cut (Boolean): 
            - Set to TRUE if the cut shares the same Location and Time as the previous cut (continuous scene).
            - Set to FALSE if there is a change in Location or Time (new scene start).
        - transition_ref (String): Notes for transitioning from the previous cut (e.g. "Zoom in to face").
        
        {f'IMPORTANT: All output text (scripts, dialogues, character names, locations, etc) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        Return ONLY JSON:
        {{
            "background_info": "Overall setting description...",
            "character_outfits": {{
                "CharacterName": "Outfit description..."
            }},
            "cuts": [
                {{
                    "cut_order": 1,
                    "script": "...",
                    "location": "Classroom",
                    "time_of_day": "Day",
                    "dialogues": [{{"speaker": "A", "type": "speech", "text": "..."}}],
                    "appearing_characters": [{{"id": "...", "name": "...", "clothing": "School Uniform"}}],
                    "panel_type": "Wide",
                    "refer_prev_cut": false,
                    "transition_ref": null
                }}
            ]
        }}
        """
        try:
            print(f"DEBUG PROMPT [generate_initial_cuts]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["director"],
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Cut Gen Failed: {e}")
            raise e


# 인스턴스는 AIService Facade에서 관리됨
