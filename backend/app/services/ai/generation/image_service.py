"""
Image Generation AI Service - 범용 이미지 생성 및 수정
"""
from google.genai import types
from typing import List, Optional

from app.services.ai.base import BaseAIService


class ImageAIService(BaseAIService):
    """범용 이미지 생성 AI 서비스"""
    
    def generate_image(
        self, 
        prompt: str, 
        width: int = 1024, 
        height: int = 1024, 
        seed: int = None, 
        language: str = "en", 
        reference_image_urls: List[str] = None, 
        prev_image_url: str = None
    ) -> bytes:
        """범용 이미지 생성"""
        self._ensure_client()

        try:
            aspect_ratio = self._get_aspect_ratio(width, height)
            
            print(f"Generating image with prompt: {prompt[:50]}..., ratio: {aspect_ratio}")
            
            # Inject language instruction
            if language and language.startswith('ko'):
                prompt += " (Any text inside the image must be in Korean Hangul)"
            
            contents = prompt
            has_images = bool(reference_image_urls or prev_image_url)
            
            if has_images:
                parts = []
                
                # Previous Cut (High Priority for Continuity)
                if prev_image_url:
                    print(f"Using previous image reference: {prev_image_url}")
                    img_bytes = self._download_image(prev_image_url)
                    if img_bytes:
                        parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))
                        prompt += "\n\n[Visual Continuity]: The image provided FIRST is the previous scene. Maintain style, lighting, and character appearance from it."

                # Reference Images
                if reference_image_urls:
                    for url in reference_image_urls:
                        img_bytes = self._download_image(url)
                        if img_bytes:
                            parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))
                
                if parts:
                    prompt_part = types.Part.from_text(text=prompt)
                    contents = [
                        types.Content(
                            role="user",
                            parts=parts + [prompt_part]
                        )
                    ]
            
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'], 
                safety_settings=self._get_safety_settings(),
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                )
            )

            print(f"DEBUG PROMPT [generate_image]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["image"],
                contents=contents,
                config=config,
            )
            
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        return part.inline_data.data
                    if part.text:
                        print(f"Model refused to generate image. Reason/Message: {part.text}")
                        raise Exception(f"Model refusal: {part.text}")
            
            print(f"No image returned. Prompt feedback: {response.prompt_feedback}")
            raise Exception("No image part found in response")
                  
        except Exception as e:
            print(f"GenAI Generation Error: {e}")
            raise e
    
    def modify_image(
        self, 
        original_image_url: str, 
        instruction: str, 
        language: str = "en"
    ) -> bytes:
        """이미지 수정 (인페인팅)"""
        self._ensure_client()
        
        print(f"Modifying image with instruction: {instruction}")
        
        try:
            img_bytes = self._download_image(original_image_url)
            
            if not img_bytes:
                raise Exception("Could not retrieve source image bytes")

            image_part = types.Part.from_bytes(data=img_bytes, mime_type="image/png") 
            
            lang_instruction = f" Ensure any text is in {language}." if language else ""
            text_part = types.Part.from_text(text=f"Edit this image: {instruction}{lang_instruction}")
            
            contents = [
                types.Content(
                    role="user",
                    parts=[image_part, text_part]
                )
            ]
            
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'],
                image_config=types.ImageConfig(
                    aspect_ratio="1:1" 
                )
            )

            print(f"DEBUG PROMPT [modify_image]: {instruction}")
            response = self.client.models.generate_content(
                model=self.model_config["image"],
                contents=contents,
                config=config
            )
            
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        return part.inline_data.data

            raise Exception("No modified image returned")
                 
        except Exception as e:
            print(f"Modification Error: {e}")
            raise e
    
    def get_embedding(self, text: str) -> List[float]:
        """텍스트 임베딩 생성"""
        self._ensure_client()
        
        try:
            response = self.client.models.embed_content(
                model="gemini-embedding-001",
                contents=text
            )
            if response.embeddings:
                return response.embeddings[0].values
            return []
        except Exception as e:
            print(f"Embedding failed: {e}")
            return [0.0] * 768
    
    def generate_project_cover_image(
        self, 
        title: str, 
        genre: str, 
        worldview: str, 
        style: str, 
        tones: List[str] = None, 
        style_ref_url: str = None, 
        character_image_urls: List[str] = None, 
        language: str = "en"
    ) -> bytes:
        """프로젝트 커버 이미지 생성"""
        self._ensure_client()
        
        tone_str = f"Tone: {', '.join(tones)}" if tones else ""

        prompt = f"""
        Create a high-quality webtoon cover illustration.
        
        Title: {title}
        Genre: {genre}
        Art Style: {style}
        {tone_str}
        
        Worldview/Setting:
        {worldview}
        
        Requirements:
        - The image should be eye-catching and representative of the genre and story.
        - Use the user-defined art style: {style}.
        - Aspect Ratio: Wide (16:9).
        - Composition: Cinematic, showing the atmosphere.
        - Place the title ("{title}") and subtitle (if any) logo in the center of the cover image in a way that suits the cover aesthetic.
        {f'- Ensure the title text is in {language} language if possible.' if language and language.startswith('ko') else ''}
        """
        
        if character_image_urls:
            prompt += f"\n- INCLUDE the characters provided in the reference images. Place them naturally in the scene according to the worldview."
        
        try:
            # Prepare Multimodal Input
            prompt, parts = self._prepare_multimodal_inputs(prompt, style_ref_url, character_image_urls)

            if parts:
                print(f"Generating multimodal cover with {len(parts)} images.")
                text_part = types.Part.from_text(text=prompt)
                 
                contents = [
                    types.Content(
                        role="user",
                        parts=parts + [text_part]
                    )
                ]
                 
                # System instruction for style consistency in cover
                cover_system_instruction = (
                    "You are a professional webtoon cover artist. "
                    "Your PRIMARY OBJECTIVE is to create an eye-catching cover that perfectly matches the specified art style. "
                    "If a STYLE REFERENCE IMAGE is provided, replicate its exact visual aesthetic. "
                    f"TARGET ART STYLE: {style}"
                )
                
                config = types.GenerateContentConfig(
                    system_instruction=cover_system_instruction,
                    response_modalities=['IMAGE'], 
                    image_config=types.ImageConfig(
                        aspect_ratio="16:9",
                    )
                )

                print(f"DEBUG PROMPT [generate_project_cover_image (multimodal)]: \n{prompt}")
                response = self.client.models.generate_content(
                    model=self.model_config["image"],
                    contents=contents,
                    config=config,
                )
                 
                if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                    for part in response.candidates[0].content.parts:
                        if part.inline_data:
                            return part.inline_data.data
                 
                print("Multimodal generation returned no image, falling back to text-only.")

        except Exception as e:
            print(f"Multimodal Cover Generation Error: {e}. Falling back to text-only.")

        # Fallback: text-only generation
        return self.generate_image(prompt, width=1920, height=1080)
    
    def generate_character_sheet(
        self, 
        name: str, 
        description: str, 
        style: str, 
        style_ref_url: str = None
    ) -> bytes:
        """캐릭터 시트 생성"""
        self._ensure_client()
        
        prompt = f"""
        Create a Character Reference Sheet for a {style} webtoon character named {name}.
        
        Character Description:
        {description}
        
        Composition Requirements:
        - Vertical Layout (9:16 Portrait aspect ratio).
        - TOP HALF: High-quality detailed Portrait/Close-up of the character's face (showing expression and facial features).
        - BOTTOM HALF: Horizontally divided into 4 equal vertical sections (side-by-side). Each section must show the character in a DIFFERENT outfit and DIFFERENT pose to showcase their personality and fashion versatility.
        - Background: Pure white, empty, whitespace. No background elements.
        - Style: {style} (High quality, professional concept art).
        
        NEGATIVE PROMPT: Do NOT include any text, logos, watermarks, signature, charts, buildings, scenery, trees, furniture, or complex background.
        
        CRITICAL: If a style reference image is provided, ONLY use it for the art style (line work, coloring, shading technique). Do NOT copy or reproduce any characters from the style reference image. Generate a completely NEW character based solely on the description above.
        """
        
        try:
            prompt, parts = self._prepare_multimodal_inputs(prompt, style_ref_url)

            if parts:
                print(f"Generating multimodal character sheet with {len(parts)} images.")
                text_part = types.Part.from_text(text=prompt)
                 
                contents = [
                    types.Content(
                        role="user",
                        parts=parts + [text_part]
                    )
                ]
                 
                # System instruction for style consistency in character sheet
                sheet_system_instruction = (
                    "You are a professional character concept artist. "
                    "Your PRIMARY OBJECTIVE is to create a consistent character reference sheet. "
                    "If a STYLE REFERENCE IMAGE is provided, replicate its exact visual aesthetic (line work, coloring technique, shading style). "
                    f"TARGET ART STYLE: {style}. "
                    "CRITICAL: Do NOT copy or reproduce any characters from the style reference image. "
                    "The style reference is ONLY for art style, NOT for character design. "
                    "Generate a completely NEW and UNIQUE character based solely on the character description provided. "
                    "IMPORTANT: Use a pure white background with NO scenery or complex elements."
                )
                
                config = types.GenerateContentConfig(
                    system_instruction=sheet_system_instruction,
                    response_modalities=['IMAGE'], 
                    image_config=types.ImageConfig(
                        aspect_ratio="9:16",
                    )
                )

                print(f"DEBUG PROMPT [generate_character_sheet (multimodal)]: \n{prompt}")
                response = self.client.models.generate_content(
                    model=self.model_config["image"],
                    contents=contents,
                    config=config,
                )
                 
                if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                    for part in response.candidates[0].content.parts:
                        if part.inline_data:
                            return part.inline_data.data
                 
                print("Multimodal generation returned no image, falling back to text-only.")

        except Exception as e:
            print(f"Multimodal Sheet Generation Error: {e}. Falling back to text-only.")

        # Fallback
        return self.generate_image(prompt, width=576, height=1024)

    def generate_character_outfit_image(
        self,
        character_name: str,
        character_description: str,
        outfit_description: str,
        style: str,
        profile_image_url: str = None,
        style_ref_url: str = None,
        episode_context: str = None
    ) -> bytes:
        """
        에피소드 특정 의상을 입은 캐릭터 이미지 생성 (5-panel composite layout)
        
        Layout (9:16 aspect ratio):
        - Left (~40%): Full body standing pose
        - Right (~60%): 2x2 grid of 4 action/pose shots based on episode context
        
        Args:
            character_name: 캐릭터 이름
            character_description: 캐릭터 외모 설명
            outfit_description: 에피소드 의상 설명
            style: 아트 스타일
            profile_image_url: 기존 캐릭터 프로필 이미지 URL (참조용)
            style_ref_url: 스타일 참조 이미지 URL
            episode_context: 에피소드 줄거리/내용 (포즈 및 장비 결정에 사용)
        
        Returns:
            생성된 이미지 바이트
        """
        self._ensure_client()
        
        # Build episode-based pose suggestions
        episode_pose_context = ""
        if episode_context:
            episode_pose_context = f"""
Based on this episode story, create 4 relevant action poses:
EPISODE CONTEXT: {episode_context}

The 4 poses should show the character:
1. Doing an action or holding equipment relevant to the story
2. Showing an emotional expression from the episode
3. In a dynamic pose relevant to the scene
4. With props or in a situation from the story
"""
        else:
            episode_pose_context = """
Create 4 varied poses showing the character:
1. Standing confidently or casually
2. Showing an expressive emotion (happy, determined, etc.)
3. In a dynamic action pose
4. Holding an item or in an interesting situation
"""
        
        prompt = f"""
Create a CHARACTER REFERENCE SHEET for a webtoon/manhwa character.

CHARACTER: {character_name}
APPEARANCE: {character_description}
OUTFIT: {outfit_description}
ART STYLE: {style}

=== LAYOUT REQUIREMENTS (9:16 vertical aspect ratio) ===

DIVIDE THE IMAGE INTO 2 SECTIONS:

LEFT SECTION (approximately 40% of width):
- Full body standing pose of the character
- Character facing forward or slightly angled (3/4 view)
- Show the complete outfit from head to toe
- Clean, neutral pose to display the costume

RIGHT SECTION (approximately 60% of width, divided into 2x2 grid = 4 small panels):
{episode_pose_context}

=== STYLE REQUIREMENTS ===
- Clean, white or light gradient background
- The character MUST wear the EXACT same outfit in ALL 5 views (1 full body + 4 poses)
- Professional webtoon character sheet style
- Do NOT include any text, labels, names, or watermarks
- Maintain consistent character identity across all poses
- High quality, professional webtoon art style

CRITICAL: Generate this as a SINGLE combined image with the described layout.
"""
        
        try:
            # Try multimodal generation with reference images
            has_refs = bool(profile_image_url or style_ref_url)
            
            if has_refs:
                parts = []
                
                # Style reference first (highest priority) - with retry
                if style_ref_url:
                    print(f"[OutfitGen] Using style reference: {style_ref_url[:60]}...")
                    style_img = self._download_image_as_pil(style_ref_url)
                    
                    # Retry once if download failed
                    if not style_img:
                        print(f"[OutfitGen] Style reference download failed, retrying...")
                        import time
                        time.sleep(0.5)
                        style_img = self._download_image_as_pil(style_ref_url)
                    
                    if style_img:
                        parts.append(style_img)
                        prompt += "\n[Reference Image 1] is the ART STYLE reference. Replicate this exact visual style (line work, coloring, shading). Do NOT copy any characters from this reference - only use it for art style."
                    else:
                        # 스타일 레퍼런스 없이 진행하면 일관성이 깨지므로 예외 발생
                        raise Exception(f"Style reference download FAILED for {character_name}. Cannot proceed without style reference.")
                
                # Character profile reference - with retry
                if profile_image_url:
                    print(f"[OutfitGen] Using character profile: {profile_image_url[:60]}...")
                    char_img = self._download_image_as_pil(profile_image_url)
                    
                    # Retry once if download failed
                    if not char_img:
                        print(f"[OutfitGen] Character profile download failed, retrying...")
                        import time
                        time.sleep(0.5)
                        char_img = self._download_image_as_pil(profile_image_url)
                    
                    if char_img:
                        parts.append(char_img)
                        prompt += f"\n[Reference Image {len(parts)}] is the CHARACTER reference. This is {character_name}. Draw this same character in the new outfit, maintaining their exact facial features and body proportions."
                    else:
                        # 캐릭터 프로필 없이 진행하면 캐릭터 일관성이 깨지므로 예외 발생
                        raise Exception(f"Character profile download FAILED for {character_name}. Cannot proceed without character reference.")
                
                if parts:
                    contents = parts + [prompt]
                    
                    system_instruction = (
                        "You are a professional webtoon/manhwa character concept artist. "
                        "Your task is to create a CHARACTER REFERENCE SHEET with multiple views. "
                        "The sheet must show: 1 full-body pose on the left side, and 4 smaller action/pose shots arranged in a 2x2 grid on the right side. "
                        "All 5 views must show the SAME character wearing the EXACT same outfit. "
                        "Maintain perfect character consistency across all poses. "
                        "Use a clean, white background. NO text, labels, or names allowed."
                    )
                    
                    config = types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_modalities=['IMAGE'],
                        image_config=types.ImageConfig(
                            aspect_ratio="9:16",  # Vertical orientation for character sheet
                        )
                    )
                    
                    print(f"[OutfitGen] Generating 5-panel outfit reference sheet for {character_name}...")
                    response = self.client.models.generate_content(
                        model=self.model_config["image"],
                        contents=contents,
                        config=config,
                    )
                    
                    if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                        for part in response.candidates[0].content.parts:
                            if part.inline_data:
                                print(f"[OutfitGen] Successfully generated 5-panel outfit sheet for {character_name}")
                                return part.inline_data.data
                    
                    print("[OutfitGen] Multimodal generation returned no image, falling back to text-only.")
                    
        except Exception as e:
            print(f"[OutfitGen] Multimodal generation error: {e}. Falling back to text-only.")
        
        # Fallback to text-only generation (9:16 ratio)
        return self.generate_image(prompt, width=576, height=1024)


# 인스턴스는 AIService Facade에서 관리됨
