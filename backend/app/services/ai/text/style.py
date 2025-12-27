"""
Style AI Service - 스타일 추천 및 확장
"""
from google.genai import types
import json
from typing import Optional

from app.services.ai.base import BaseAIService
from app.services.storage import storage


class StyleAIService(BaseAIService):
    """스타일 관련 AI 기능"""
    
    def recommend_style(self, description: str, language: str = "en") -> dict:
        """프로젝트 설명 기반 스타일 추천 (3개 옵션)"""
        self._ensure_client()

        prompt = f"""
        You are an expert art director for webtoons.
        Based on the following story or worldview description, recommend 3 distinct art styles that would suit the project.

        Description: "{description}"
        
        {f'IMPORTANT: All output text (descriptions, labels) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        Return ONLY a JSON object with the following structure:
        {{
            "options": [
                {{
                    "id": "style_A",
                    "label": "Style Name (e.g., Noir, Watercolor)",
                    "description": "Why this fits the story.",
                    "sample_image_url": "https://example.com/style_sample.png" 
                }},
                ...
            ]
        }}
        """
        
        try:
            print(f"DEBUG PROMPT [recommend_style]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["style"],
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            cleaned_text = self._clean_json_text(response.text)
            parsed_json = json.loads(cleaned_text)
            
            # Generate images for each style
            if "options" in parsed_json:
                for option in parsed_json["options"]:
                    # Remove hallucinated URL
                    option.pop("sample_image_url", None)
                    
                    try:
                        style_label = option.get("label", "Art Style")
                        style_desc = option.get("description", "")
                        image_prompt = f"A high-quality representative illustration of the art style: {style_label}. {style_desc} Visual composition: portrait or character focus."
                        
                        print(f"Generating sample for style: {style_label}")
                        # Import here to avoid circular dependency
                        from app.services.ai.generation.image_service import ImageAIService
                        image_service = ImageAIService()
                        img_bytes = image_service.generate_image(image_prompt, width=768, height=1024)
                        
                        # Upload to storage
                        url = storage.upload_image(img_bytes, schema="styles", identifier=style_label)
                        option["sample_image_url"] = url
                    except Exception as e:
                        print(f"Failed to generate sample for {style_label}: {e}")
                        
            return parsed_json
            
        except Exception as e:
            print(f"Error in recommend_style: {e}")
            return {"options": []}
    
    def augment_style_description(
        self, 
        current_prompt: str, 
        project_context: dict = None, 
        language: str = "en"
    ) -> str:
        """스타일 설명 확장 (이미지 생성용 프롬프트 최적화)"""
        self._ensure_client()
             
        context_str = ""
        if project_context:
            context_str = f"""
            Project Context:
            Title: {project_context.get('title', 'Unknown')}
            Genres: {', '.join(project_context.get('genres', [])) if project_context.get('genres') else 'Not specified'}
            Worldview: {project_context.get('worldview', 'Not specified')}
            """

        prompt = f"""
        You are a prompt engineering expert for generative AI art.
        Improve the user's rough art style description into a high-quality, detailed prompt suitable for image generation models (like Midjourney or Stable Diffusion).
        
        {context_str}
        
        User's Rough Description: "{current_prompt}"
        
        {f'IMPORTANT: The output prompt description MUST be in {language} language.' if language and language != 'en' else ''}
        
        Task:
        1. Expand on valid aesthetic keywords (lighting, texture, composition).
        2. If project context is provided, ensure the style fits the genre and tone.
        3. Keep it concise but descriptive (under 100 words).
        4. Return ONLY the improved prompt text. Do not include quotes or explanations.
        """
        
        try:
            print(f"DEBUG PROMPT [augment_style_description]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["style"],
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"Error in augment_style_description: {e}")
            raise e


# 인스턴스는 AIService Facade에서 관리됨
