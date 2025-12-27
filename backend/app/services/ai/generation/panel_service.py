"""
Panel Image Generation AI Service - 웹툰 패널 이미지 생성
"""
from google.genai import types
from typing import List, Optional

from app.services.ai.base import BaseAIService


class PanelAIService(BaseAIService):
    """패널 이미지 생성 AI 서비스"""
    
    # Aspect Ratio 매핑
    ASPECT_RATIO_MAPPING = {
        "wide": "16:9",
        "vertical": "9:16",
        "square": "1:1",
        "21:9": "16:9",
        "3:2": "4:3",
        "2:3": "3:4",
        "4:5": "3:4",
        "5:4": "4:3",
        "1:1": "1:1",
        "16:9": "16:9",
        "9:16": "9:16",
        "3:4": "3:4",
        "4:3": "4:3"
    }
    
    def generate_panel_image(
        self, 
        prompt: str, 
        width: int = 1024, 
        height: int = 1024, 
        aspect_ratio: str = None,
        style_ref_url: str = None, 
        character_data: List[dict] = None, 
        prev_scene_url: str = None,
        language: str = "en",
        art_style: str = None,
        reference_board_urls: List[str] = None,
        reference_board_prompt: str = None
    ) -> bytes:
        """
        웹툰 패널 이미지 생성
        
        Args:
            prompt: 장면 설명
            width, height: 이미지 크기
            aspect_ratio: 비율 문자열 (예: "16:9", "wide")
            style_ref_url: 스타일 참조 이미지 URL
            character_data: 캐릭터 참조 정보 목록 (레퍼런스 보드 없을 때 사용)
            prev_scene_url: 이전 장면 이미지 URL (연속성 유지)
            language: 언어 코드
            art_style: 아트 스타일 설명 텍스트
            reference_board_urls: 캐릭터 레퍼런스 보드 URL 리스트 (있으면 character_data 대신 사용)
            reference_board_prompt: 레퍼런스 보드 설명 프롬프트
        """
        self._ensure_client()

        # 1. Art Style Instruction (TOP PRIORITY)
        style_instruction = ""
        if art_style:
            style_instruction = f"""
        *** ART STYLE (HIGHEST PRIORITY) ***
        You MUST draw this panel in the following art style: {art_style}
        This style instruction takes precedence over all other visual directions.
        """
        
        # 2. Base Prompt Construction
        full_prompt = f"""
        Create a high-quality webtoon panel.
        {style_instruction}
        
        Scene Description:
        {prompt}
        
        Requirements:
        - STRICTLY follow the specified art style{f': {art_style}' if art_style else ' of the provided Style Reference'}.
        - Maintain visual consistency with the Previous Scene (if any).
        - Include the specific characters provided (if mentioned in scene).
        {f'- Any speech bubbles or text in the image MUST be in {language}.' if language and language.startswith('ko') else ''}
        """
        
        try:
            # Collect PIL Image objects for multimodal input
            image_parts = []
            
            # 2. Add Style Reference
            if style_ref_url:
                print(f"Adding Style Reference: {style_ref_url}")
                style_img = self._download_image_as_pil(style_ref_url)
                if style_img:
                    image_parts.append(style_img)
                    full_prompt += "\n[Reference Image 1] is the ART STYLE. Mimic it exactly."

            # 3. Add Previous Scene (for continuity)
            if prev_scene_url:
                print(f"Adding Previous Scene: {prev_scene_url}")
                prev_img = self._download_image_as_pil(prev_scene_url)
                if prev_img:
                    image_parts.append(prev_img)
                    full_prompt += f"\n[Reference Image {len(image_parts)}] is the PREVIOUS SCENE. Maintain continuity (lighting, colors, environment)."

            # 4. Add Character References (Board or Individual)
            if reference_board_urls:
                # Use Reference Board(s) - preferred method for consistency
                print(f"Adding {len(reference_board_urls)} Reference Board(s)")
                for idx, board_url in enumerate(reference_board_urls):
                    board_img = self._download_image_as_pil(board_url)
                    if board_img:
                        image_parts.append(board_img)
                
                # Add board description to prompt
                if reference_board_prompt:
                    full_prompt += f"\n\n{reference_board_prompt}"
                else:
                    full_prompt += f"\n\n[Reference Image(s)] show the CHARACTER REFERENCE BOARD(s). Each character MUST wear their EXACT outfit as shown."
            elif character_data:
                # Fallback to individual character references
                print(f"Adding {len(character_data)} Character References")
                for char in character_data:
                    c_url = char.get("url")
                    c_name = char.get("name")
                    if c_url:
                        c_img = self._download_image_as_pil(c_url)
                        if c_img:
                            image_parts.append(c_img)
                            full_prompt += f"\n[Reference Image {len(image_parts)}] is character '{c_name}'. Include them if relevant to the scene."

            # 5. Determine Aspect Ratio
            final_ratio = "1:1"
            if aspect_ratio:
                r_lower = aspect_ratio.lower()
                final_ratio = self.ASPECT_RATIO_MAPPING.get(r_lower, "1:1")
            else:
                final_ratio = self._get_aspect_ratio(width, height)

            # 6. Call API with PIL Images directly
            print(f"Generating Panel with {len(image_parts)} PIL images. Ratio: {final_ratio}")
            
            contents = image_parts + [full_prompt]
            
            # Build System Instruction for style consistency
            system_parts = [
                "You are a professional webtoon artist. Your PRIMARY OBJECTIVE is visual consistency.",
                "CRITICAL RULES:",
                "1. If a STYLE REFERENCE IMAGE is provided, you MUST replicate its exact art style - brushwork, color palette, shading technique, and overall aesthetic.",
                "2. IMPORTANT: The STYLE REFERENCE IMAGE is for STYLE ONLY. Do NOT copy or reproduce any people, characters, or figures shown in the style reference. Create NEW characters based on the scene description.",
                "3. The specified art style takes ABSOLUTE PRECEDENCE over any other visual interpretation.",
                "4. Maintain consistent character appearances across panels using the CHARACTER REFERENCE IMAGES (if provided).",
                "5. Do NOT add text labels, character names, or watermarks to the image.",
                "6. Panel borders should only be used when dramatically necessary."
            ]
            if art_style:
                system_parts.append(f"7. TARGET ART STYLE: {art_style}")
            
            system_instruction = "\n".join(system_parts)
            
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_modalities=['IMAGE'], 
                image_config=types.ImageConfig(aspect_ratio=final_ratio)
            )

            print(f"DEBUG PROMPT [generate_panel_image]: \n{full_prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["image"],
                contents=contents,
                config=config,
            )
            
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        return part.inline_data.data
            
            raise Exception("No image returned from Multimodal Generation")

        except Exception as e:
            print(f"Panel Generation Error: {e}. Falling back to text-only.")
            # Fallback to simple generation
            from app.services.ai.generation.image_service import ImageAIService
            image_service = ImageAIService()
            return image_service.generate_image(prompt, width, height, language=language)


# 인스턴스는 AIService Facade에서 관리됨
