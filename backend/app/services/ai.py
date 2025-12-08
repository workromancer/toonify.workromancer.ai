from google import genai
from google.genai import types
from app.core.config import settings
import io
import base64
import requests
import json
from typing import List, Optional
import os

class AIService:
    def __init__(self):
        # Initialize Google GenAI Client
        try:
            api_key = settings.GEMINI_API_KEY or os.environ.get("GOOGLE_CLOUD_API_KEY")
            self.client = genai.Client(
                vertexai=True,
                api_key=api_key
            )
            # Default models
            self.text_model = "gemini-3-pro-preview"
            self.image_model = "gemini-3-pro-image-preview" 
        except Exception as e:
            print(f"GenAI Client Init Failed: {e}")
            self.client = None

    def recommend_style(self, description: str) -> dict:
        """
        Recommends 3 distinct art styles based on the project description/worldview.
        """
        prompt = f"""
        You are an expert art director for webtoons.
        Based on the following story or worldview description, recommend 3 distinct art styles that would suit the project.

        Description: "{description}"

        Return ONLY a JSON object with the following structure:
        {{
            "options": [
                {{
                    "id": "style_A",
                    "label": "Style Name (e.g., Noir, Watercolor)",
                    "description": "Why this fits the story.",
                    "sample_image_url": "https://placeholder.com/style_a.png" 
                }},
                ...
            ]
        }}
        """
        
        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            return json.loads(response.text)
            
        except Exception as e:
            print(f"Style Director Error: {e}")
            return {
                "options": [
                    {"id": "s1", "label": "Modern Webtoon", "description": "Clean lines, standard coloring.", "sample_image_url": ""},
                    {"id": "s2", "label": "Sketchy/Rough", "description": "For intense or dark themes.", "sample_image_url": ""},
                    {"id": "s3", "label": "Soft/Pastel", "description": "For romance or slice of life.", "sample_image_url": ""}
                ]
            }

    def augment_worldview(self, description: str, title: str = None, subtitle: str = None, genres: List[str] = None) -> dict:
        """
        Augments and refines the worldview description using AI, providing 3 options.
        """
        
        context_str = ""
        if title:
            context_str += f"\nProject Title: {title}"
        if subtitle:
            context_str += f"\nSubtitle: {subtitle}"
        if genres:
            context_str += f"\nGenres: {', '.join(genres)}"
            
        prompt = f"""
        You are an expert fantasy/sci-fi world builder.
        Based on the following worldview description and project context, create 3 distinct directions/variations for this world.
        Each option should have a catchy title, a short summary, and a detailed enhanced description.
        
        Project Context:{context_str}
        
        Original Description: "{description}"
        
        Return ONLY a JSON object with the following structure:
        {{
            "options": [
                {{
                    "id": "option_1",
                    "title": "Title (e.g., Gritty Realism)",
                    "tone": "Dark / Serious / Whimsical",
                    "key_features": ["Feature 1", "Feature 2", "Feature 3"],
                    "description": "Short summary of this direction",
                    "content": "Full detailed enhanced worldview description..."
                }},
                ...
            ]
        }}
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.text_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Worldview Augmentation Error: {e}")
            # Fallback
            return {
                "options": [
                    {
                        "id": "fallback_1",
                        "title": "Enhanced Version",
                        "tone": "Neutral",
                        "key_features": ["Refined Description"],
                        "description": "A refined version of your description.",
                        "content": description + "\n(AI augmented)"
                    },
                    {
                        "id": "fallback_2",
                        "title": "Darker Twist",
                        "tone": "Dark",
                        "key_features": ["Shadows", "Mystery"],
                        "description": "A darker take on your world.",
                        "content": description + "\nThe shadows in this world are alive..."
                    },
                    {
                        "id": "fallback_3",
                        "title": "Magical Expansion",
                        "tone": "Magical",
                        "key_features": ["High Magic", "Wonder"],
                        "description": "More focus on magic systems.",
                        "content": description + "\nMagic flows through every vein of this land..."
                    }
                ]
            }

    def generate_direction_options(self, script: str, character_context: str = "") -> dict:
        """
        Generates 3 visual direction options based on the user script.
        """
        prompt = f"""
        You are a professional webtoon director. 
        Analyze the following script and suggest 3 distinct visual direction options (camera angle, composition, mood).
        
        Script: "{script}"
        
        {f'Ensure the visual description includes the following character details if relevant: {character_context}' if character_context else ''}
        
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
            response = self.client.models.generate_content(
                model=self.text_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text)
            
        except Exception as e:
            print(f"Director AI Error: {e}")
            # Fallback
            return {
                "options": [
                    {
                        "id": "A",
                        "label": "Close Up (Mock)",
                        "description": "Focus on character expression.",
                        "aspect_ratio": "3:4",
                        "image_prompt": f"Close up shot, {script}, webtoon style"
                    },
                    {
                        "id": "B",
                        "label": "Wide Shot (Mock)",
                        "description": "Showing the environment.",
                        "aspect_ratio": "3:4",
                        "image_prompt": f"Wide shot, {script}, webtoon style"
                    },
                    {
                        "id": "C",
                        "label": "Dynamic Angle (Mock)",
                        "description": "Action oriented view.",
                        "aspect_ratio": "3:4",
                        "image_prompt": f"Dynamic angle, {script}, webtoon style"
                    }
                ]
            }

    def generate_image(self, prompt: str, width: int = 1024, height: int = 1024, seed: int = None) -> bytes:
        """
        Generates an image using Google GenAI SDK (Gemini 3).
        """
        try:
            # Aspect Ratio logic
            ratio = width / height
            aspect_ratio = "1:1"
            if abs(ratio - 3/4) < 0.01:
                aspect_ratio = "3:4"
            elif abs(ratio - 4/3) < 0.01:
                aspect_ratio = "4:3"
            elif abs(ratio - 16/9) < 0.01:
                aspect_ratio = "16:9"
            
            print(f"Generating image with prompt: {prompt[:50]}..., seed: {seed}, ratio: {aspect_ratio}")
            
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'], # Requesting image only
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                )
                # Seed is not directly supported in ImageConfig types yet, usually controlled by model or not exposed. 
                # If supported, it would be in generation_config.
            )

            response = self.client.models.generate_content(
                model=self.image_model,
                contents=prompt,
                config=config,
            )
            
            # Extract image from candidates
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        return part.inline_data.data
            
            raise Exception("No image part found in response")
                 
        except Exception as e:
            print(f"GenAI Generation Error: {e}")
            return self._generate_image_mock(prompt, width, height, seed)

    def modify_image(self, original_image_url: str, instruction: str) -> bytes:
        """
        Modifies an existing image based on the instruction.
        Using Gemini 3 multimodal generation (Image + Text -> Image).
        """
        print(f"Modifying image with instruction: {instruction}")
        
        try:
            # 1. Retrieve Image Bytes
            img_bytes = None
            if original_image_url.startswith("data:image"):
                # Decode Base64
                header, encoded = original_image_url.split(",", 1)
                img_bytes = base64.b64decode(encoded)
            elif original_image_url.startswith("http"):
                # Download
                res = requests.get(original_image_url)
                if res.status_code == 200:
                    img_bytes = res.content
                else:
                     raise Exception("Failed to download image")
            else:
                 raise Exception("Invalid image URL format")
            
            if not img_bytes:
                raise Exception("Could not retrieve source image bytes")

            # 2. Call GenAI
            # Construct content with image and text
            # Depending on how the new SDK handles bytes, we might need types.Part.from_bytes
            
            image_part = types.Part.from_bytes(data=img_bytes, mime_type="image/png") # Assuming PNG/JPEG, API usually detects or we can guess
            text_part = types.Part.from_text(text=f"Edit this image: {instruction}")
            
            contents = [
                types.Content(
                    role="user",
                    parts=[image_part, text_part]
                )
            ]
            
            # Using image model for editing
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'],
                image_config=types.ImageConfig(
                    aspect_ratio="1:1" # Preserve original aspect usually, but here strict.
                    # Ideally we match input aspect ratio.
                )
            )

            response = self.client.models.generate_content(
                model=self.image_model,
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
            return self._generate_image_mock(f"Modified: {instruction}", 1024, 1024)

    def _generate_image_mock(self, prompt: str, width: int, height: int, seed: int = None) -> bytes:
        from PIL import Image, ImageDraw
        import random
        
        if seed is not None:
            random.seed(seed)
            
        img = Image.new('RGB', (width, height), color = (50, 50, 50))
        d = ImageDraw.Draw(img)
        d.text((10,10), f"Toonify AI (Mock) - Gemini 3 Failed\nPrompt: {prompt[:50]}...", fill=(255,255,255))
        
        color = (random.randint(0,255), random.randint(0,255), random.randint(0,255))
        d.rectangle([width//4, height//4, width*3//4, height*3//4], outline=color, width=5)
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

    def get_embedding(self, text: str) -> List[float]:
        """
        Generates text embedding for RAG.
        """
        try:
             # embedding model might be different, let's use a standard one supported by genai
             response = self.client.models.embed_content(
                 model="gemini-embedding-001",
                 contents=text
             )
             if response.embeddings:
                 return response.embeddings[0].values
             return []
        except Exception as e:
             print(f"Embedding Error: {e}")
             return [0.0] * 768

ai_service = AIService()
