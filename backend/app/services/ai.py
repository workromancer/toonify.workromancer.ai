import vertexai
from vertexai.preview.generative_models import GenerativeModel, Part
from vertexai.preview.vision_models import ImageGenerationModel, Image as VertexImage
from app.core.config import settings
import io
import base64
import requests
from typing import List

class AIService:
    def __init__(self):
        # Initialize Vertex AI
        try:
            vertexai.init(
                project=settings.GOOGLE_CLOUD_PROJECT, 
                location=settings.GOOGLE_CLOUD_LOCATION
            )
            self.model_name = "gemini-3-pro-image-preview" 
        except Exception as e:
            print(f"Vertex AI Init Failed: {e}")

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
            model = GenerativeModel("gemini-1.5-flash-001")
            response = model.generate_content(prompt)
            
            # Cleanup
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            if text.endswith("```"):
                text = text[:-3]
            
            import json
            return json.loads(text)
            
        except Exception as e:
            print(f"Style Director Error: {e}")
            return {
                "options": [
                    {"id": "s1", "label": "Modern Webtoon", "description": "Clean lines, standard coloring.", "sample_image_url": ""},
                    {"id": "s2", "label": "Sketchy/Rough", "description": "For intense or dark themes.", "sample_image_url": ""},
                    {"id": "s3", "label": "Soft/Pastel", "description": "For romance or slice of life.", "sample_image_url": ""}
                ]
            }

            return {
                "options": [
                    {"id": "s1", "label": "Modern Webtoon", "description": "Clean lines, standard coloring.", "sample_image_url": ""},
                    {"id": "s2", "label": "Sketchy/Rough", "description": "For intense or dark themes.", "sample_image_url": ""},
                    {"id": "s3", "label": "Soft/Pastel", "description": "For romance or slice of life.", "sample_image_url": ""}
                ]
            }

    def augment_worldview(self, description: str) -> str:
        """
        Augments and refines the worldview description using AI.
        """
        prompt = f"""
        You are an expert fantasy/sci-fi world builder.
        Enhance the following worldview description to make it more immersive, detailed, and suitable for a webtoon setting.
        Keep the core ideas but expand on them.
        
        Original Description: "{description}"
        
        Return ONLY the enhanced description text.
        """
        
        try:
            model = GenerativeModel("gemini-1.5-flash-001")
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Worldview Augmentation Error: {e}")
            return description + "\n(AI augmentation failed, using original)"

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
            model = GenerativeModel("gemini-1.5-flash-001") 
            response = model.generate_content(prompt)
            
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            if text.endswith("```"):
                text = text[:-3]
            
            import json
            return json.loads(text)
            
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
            
            from google import genai
            from google.genai import types
            
            client = genai.Client(
                vertexai=True, 
                project=settings.GOOGLE_CLOUD_PROJECT, 
                location=settings.GOOGLE_CLOUD_LOCATION
            )
            
            response = client.models.generate_content(
                model='gemini-3-pro-image-preview',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=['IMAGE', 'TEXT'],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                    ),
                ),
            )
            
            # Check for errors
            if not response.candidates or not response.candidates[0]:
                 raise Exception("No candidates returned")
                 
            # Extract image from parts
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

            # 2. Call Vertex AI for Edit
            # ImageGenerationModel.edit_image takes 'base_image' as VertexImage
            base_image = VertexImage(img_bytes)
            
            model = ImageGenerationModel.from_pretrained("gemini-3-pro-image-preview")
            response = model.edit_image(
                base_image=base_image,
                prompt=instruction, # The instruction acts as the prompt for the new image or the change
                number_of_images=1,
                language="en",
                safety_filter_level="block_some",
                person_generation="allow_adult"
            )
            
            if response and response[0]:
                 return response[0]._image_bytes
            else:
                 raise Exception("No modified image returned")
                 
        except Exception as e:
            print(f"Modification Error: {e}")
            # Fallback to Mock
            return self._generate_image_mock(f"Modified: {instruction}", 1024, 1024)

    def _generate_image_mock(self, prompt: str, width: int, height: int, seed: int = None) -> bytes:
        from PIL import Image, ImageDraw
        import random
        
        if seed is not None:
            random.seed(seed)
            
        img = Image.new('RGB', (width, height), color = (50, 50, 50))
        d = ImageDraw.Draw(img)
        d.text((10,10), f"Toonify AI (Mock)\nPrompt: {prompt[:50]}...\nSeed: {seed}", fill=(255,255,255))
        
        color = (random.randint(0,255), random.randint(0,255), random.randint(0,255))
        d.rectangle([width//4, height//4, width*3//4, height*3//4], outline=color, width=5)
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

    def get_embedding(self, text: str) -> List[float]:
        """
        Generates text embedding for RAG.
        """
        from vertexai.preview.language_models import TextEmbeddingModel
        
        try:
             model = TextEmbeddingModel.from_pretrained("text-embedding-004")
             embeddings = model.get_embeddings([text])
             if embeddings:
                 return embeddings[0].values
             return []
        except Exception as e:
             print(f"Embedding Error: {e}")
             # Return zero vector fallback
             return [0.0] * 768

ai_service = AIService()
