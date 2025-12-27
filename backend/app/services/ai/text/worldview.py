"""
Worldview AI Service - 세계관 확장
"""
from google.genai import types
import json
from typing import List, Optional

from app.services.ai.base import BaseAIService


class WorldviewAIService(BaseAIService):
    """세계관 관련 AI 기능"""
    
    def augment_worldview(
        self, 
        description: str, 
        title: str = None, 
        subtitle: str = None, 
        genres: List[str] = None, 
        language: str = "en"
    ) -> dict:
        """세계관 설명 확장 (3개 방향 제안)"""
        self._ensure_client()
             
        context_str = ""
        if title:
            context_str += f"\nProject Title: {title}"
        if subtitle:
            context_str += f"\nSubtitle: {subtitle}"
        if genres:
            context_str += f"\nGenres: {', '.join(genres)}"
            
        desc_str = f'"{description}"' if description else "(None provided, suggest based on project context)"

        prompt = f"""
        You are an expert webtoon scenario writer proficient in all genres.
        Based on the following worldview description and project context, create 3 distinct directions/variations for this world.
        The 3 options MUST be clearly distinct in style, mood, and narrative focus from each other.
        Each option should have a catchy title, a short summary, and a detailed enhanced description.
        
        Project Context:{context_str}
        
        Original Description: {desc_str}
        
        {f'IMPORTANT: All output text (titles, summaries, descriptions) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        Return ONLY a JSON object with the following structure:
        {{
            "options": [
                {{
                    "id": "option_1",
                    "title": "Title (e.g., Gritty Realism)",
                    "tone": ["Tone 1", "Tone 2"], 
                    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
                    "description": "Short summary of this direction",
                    "content": "Full detailed enhanced worldview description..."
                }},
                ...
            ]
        }}
        """
        
        try:
            print(f"DEBUG PROMPT [augment_worldview]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["worldview"],
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Worldview Augmentation Error: {e}")
            raise e


# 인스턴스는 AIService Facade에서 관리됨
