"""
Character AI Service - 캐릭터 생성 및 분석
"""
from google.genai import types
import json
from typing import List, Optional

from app.services.ai.base import BaseAIService


class CharacterAIService(BaseAIService):
    """캐릭터 관련 AI 기능"""
    
    def augment_character_text(
        self, 
        name: str, 
        tags: List[str], 
        mood: list | str, 
        style: str, 
        project_context: str = "", 
        language: str = "en"
    ) -> dict:
        """캐릭터 컨셉 확장 (3가지 옵션 생성)"""
        self._ensure_client()

        mood_str = ", ".join(mood) if isinstance(mood, list) else mood

        prompt = f"""
        You are a character design expert for {style} webtoons.
        Based on the initial concept and the project context, create 3 distinct character profile variations that fit the world.
        
        Project Context:
        {project_context}
        
        Input Name: {name}
        Initial Tags: {', '.join(tags) if tags else 'None'}
        Mood: {mood_str}
        
        For each option, provide:
        - Unique Name (can be same or variation)
        - Age (e.g. "Early 20s", "Ancient")
        - Personality (Short summary)
        - Features (Visual traits as list)
        - Pros (Strengths/Advantages)
        - Cons (Weaknesses/Flaws)
        - Bio (Structured background):
            - Origin: Where they came from or their past.
            - Goals: What they want to achieve.
            - Quirk: A unique habit or trait.
         - Visual Description (Detailed prompt for image generation, ensuring it respects the Project Context/Worldview)
        
        {f'IMPORTANT: All output text (names, personalities, bios) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul for names and text.' if language and language.startswith('ko') else ''}

        Return ONLY a JSON object:
        {{
            "options": [
                {{
                    "name": "Name",
                    "age": "Age",
                    "personality": "...",
                    "features": ["tag1", "tag2"],
                    "pros": ["..."],
                    "cons": ["..."],
                    "bio": {{
                        "origin": "...",
                        "goals": "...",
                        "quirk": "..."
                    }},
                    "visual_description": "...",
                    "reason": "Why this fits"
                }},
                ...
            ]
        }}
        """
        try:
            print(f"DEBUG PROMPT [augment_character_text]: \n{prompt}")
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
            print(f"Character Augment Error: {e}")
            raise e
    
    def get_character_suggestion(
        self, 
        suggestion_type: str, 
        project_context: str, 
        current_data: dict, 
        language: str = "en"
    ) -> dict:
        """캐릭터 속성 제안 (이름/비주얼/배경)"""
        self._ensure_client()

        target_model = self.model_config["style"]

        prompt = ""
        if suggestion_type == "name":
            prompt = f"""
            Suggest a creative character name and a suitable age fitting for this Webtoon Project.
            Project Context:
            {project_context}
            
            Format: JSON object with "name" and "age" (int or string). Example: {{"name": "Jiwoo", "age": "19"}}
            {f'If language is Korean ({language}), the name MUST be in Korean Hangul.' if language and language.startswith('ko') else ''}
            """
        elif suggestion_type == "visuals":
            prompt = f"""
            Suggest 5-7 visual appearance keywords/tags for a character in this Webtoon.
            Project Context: {project_context}
            Character Name: {current_data.get('name', 'Unknown')}
            Age: {current_data.get('age', 'Unknown')}
            
            Format: JSON list of strings. Example: ["Tall", "Scarred eye", "Hoodie"]
            {f'IMPORTANT: The tags MUST be in {language} language.' if language else ''}
            {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}
            """
        elif suggestion_type == "lore":
            prompt = f"""
            Write a compelling, short character description/lore (2-3 sentences) fitting the archetype and world.
            Project Context: {project_context}
            Character: {current_data.get('name', 'Unknown')}, {current_data.get('age', 'Unknown')} years old.
            Archetype: {current_data.get('role', 'Unknown')}
            Personality: {current_data.get('personality', 'Unknown')}
            Visuals: {', '.join(current_data.get('visual_keywords', []))}
            
            Format: Just the description text.
            {f'IMPORTANT: The text MUST be in {language} language.' if language else ''}
            {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}
            """
        
        try:
            print(f"DEBUG PROMPT [get_character_suggestion]: \n{prompt}")
            response = self.client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json" if suggestion_type in ["visuals", "name"] else "text/plain"
                )
            )
            
            if suggestion_type in ["visuals", "name"]:
                cleaned = self._clean_json_text(response.text)
                return json.loads(cleaned)
            else:
                return {"suggestion": response.text.strip()}
                
        except Exception as e:
            # Fallback to lite model
            print(f"Suggestion Error with {target_model}: {e}. Retrying with gemini-2.5-flash-lite.")
            try:
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash-lite",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json" if suggestion_type in ["visuals", "name"] else "text/plain"
                    )
                )
                if suggestion_type in ["visuals", "name"]:
                    cleaned = self._clean_json_text(response.text)
                    return json.loads(cleaned)
                else:
                    return {"suggestion": response.text.strip()}
                    
            except Exception as e2:
                print(f"Fallback suggestion failed: {e2}")
                raise e2
    
    def generate_character_batch_suggestions(
        self, 
        project_context: str, 
        count: int = 10, 
        language: str = "en",
        include_protagonist: bool = False
    ) -> dict:
        """배치 캐릭터 제안 생성
        
        Args:
            project_context: 프로젝트 컨텍스트 (제목, 장르, 세계관 등)
            count: 생성할 캐릭터 수
            language: 출력 언어
            include_protagonist: True면 주인공 포함 (프로젝트 초기 생성 시)
        """
        self._ensure_client()
        
        # 주인공 포함 여부에 따른 프롬프트 분기
        if include_protagonist:
            protagonist_instruction = """
        IMPORTANT: The FIRST character in the list MUST be a compelling Protagonist.
        Design a main character who:
        - Has clear motivations and goals tied to the worldview
        - Has relatable personality traits with both strengths and flaws
        - Serves as the central figure of the story
        The remaining characters should be diverse supporting cast members (antagonist, allies, rivals, etc).
        """
        else:
            protagonist_instruction = "Exclude the Protagonist if already defined (assume these are potential additional cast members)."

        prompt = f"""
        You are a casting director for a Webtoon.
        Project Context:
        {project_context}
        
        Create {count} distinct, interesting character concepts that could fit into this story.
        They should vary in age, role, personality, and appearance.
        {protagonist_instruction}

        For each character, you MUST provide:
        - "personality_tags": Choose 1-3 from ["Cheerful", "Serious", "Cold", "Tsundere", "Mysterious", "Melancholic", "Pure", "Madness"].
        - "theme_color": A Hex color code (e.g. "#ef4444", "#3b82f6") that represents the character's vibe.
        - "recommended_role": Choose the BEST fitting internal ID from ["protagonist", "antagonist", "second_lead", "scene_stealer"].
        - "stats": Attributes (strength, intelligence, charisma, luck, empathy, leadership) from 0-100.
        
        {f'IMPORTANT: All output text (names, role summary, bios, personality summary) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        Return ONLY a JSON object:
        {{
            "suggestions": [
                {{
                    "name": "Name",
                    "age": "Age (e.g. 19)",
                    "role": "Role Title (e.g. Rival, Best Friend)", 
                    "recommended_role": "arch_id",
                    "visual_keywords": ["tag1", "tag2"], 
                    "personality": "Short Personality summary sentence...",
                    "personality_tags": ["Pure", "Cheerful"],
                    "theme_color": "#hex",
                    "bio": "Brief background...",
                    "stats": {{
                        "strength": 50, "intelligence": 50, "charisma": 50, "luck": 50, "empathy": 50, "leadership": 50
                    }}
                }},
                ...
            ]
        }}
        """
        try:
            print(f"DEBUG PROMPT [batch_suggestions]: \n{prompt}")
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
            print(f"Batch Suggestion Error: {e}")
            raise e

    
    def analyze_character_concept(
        self, 
        project_context: str, 
        name: str, 
        age: str, 
        visual_keywords: List[str], 
        personality: str, 
        language: str = "en"
    ) -> dict:
        """캐릭터 컨셉 분석 (역할/배경 제안)"""
        self._ensure_client()
        
        prompt = f"""
        Analyze the following character concept within the provided Project Worldview and suggest the best fitting Role (Archetype) and a unique background story (Lore).

        Project Context:
        {project_context}

        Character Concept:
        - Name: {name}
        - Age: {age}
        - Visual Keywords: {', '.join(visual_keywords)}
        - Personality: {personality}

        Available Roles (Archetypes):
        1. "The Protagonist" (Center of story, determined, relatable)
        2. "The Antagonist" (Opposing force, ambitious, twisted ideals)
        3. "The Second Lead" (Devoted support, rival, tragic)
        4. "The Scene Stealer" (Comic relief, wildcard, distinct personality)

        Task:
        1. Select the BEST fitting Role from the list above.
        2. Write a unique "Lore" (Background Description) that weaves the character's personality and visuals into the project's worldview. The lore should explain their motivation or current state.
        3. Suggest stats (0-100) for the following 6 attributes:
           - Strength (Physical power)
           - Intelligence (Mental acuity)
           - Charisma (Social influence)
           - Luck (Fortune)
           - Empathy (Emotional understanding)
           - Leadership (Ability to command)
        
        
        {f'IMPORTANT: All output text (analysis, lore, titles) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        Return ONLY a JSON object:
        {{
            "recommended_role": "Exact Title from list above",
            "analysis": "Brief reason why this role fits",
            "lore": "A compelling 2-3 sentence background story...",
            "stats": {{
                "strength": 50,
                "intelligence": 50,
                "charisma": 50,
                "luck": 50,
                "empathy": 50,
                "leadership": 50
            }}
        }}
        """

        try:
            print(f"DEBUG PROMPT [analyze_character_concept]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["analysis"], 
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            cleaned = self._clean_json_text(response.text)
            return json.loads(cleaned)

        except Exception as e:
            print(f"Error in analyze_character_concept: {e}")
            return {
                "recommended_role": "The Protagonist",
                "analysis": "Fallback due to error.",
                "lore": f"{name} is a mysterious character in this world.",
                "stats": {"charisma": 50, "strength": 50, "luck": 50}
            }


# 인스턴스는 AIService Facade에서 관리됨
