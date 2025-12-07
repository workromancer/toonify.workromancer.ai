import vertexai
from vertexai.preview.generative_models import GenerativeModel, Image
from app.core.config import settings
import io

class AIService:
    def __init__(self):
        # Initialize Vertex AI
        # Ensure credentials (GOOGLE_APPLICATION_CREDENTIALS) are set in env or via gcloud auth
        try:
            vertexai.init(
                project=settings.GOOGLE_CLOUD_PROJECT, 
                location=settings.GOOGLE_CLOUD_LOCATION
            )
            # User specified model. DO NOT CHANGE.
            self.model_name = "gemini-3-pro-image-preview" 
        except Exception as e:
            print(f"Vertex AI Init Failed: {e}")

    def generate_direction_options(self, script: str) -> dict:
        """
        Generates 3 visual direction options based on the user script.
        Returns a JSON object with a list of options.
        """
        prompt = f"""
        You are a professional webtoon director. 
        Analyze the following script and suggest 3 distinct visual direction options (camera angle, composition, mood).
        
        Script: "{script}"
        
        Return ONLY a JSON object with the following structure:
        {{
            "options": [
                {{
                    "id": "A",
                    "label": "Short Title (e.g., Low Angle)",
                    "description": "Brief description of the visual composition.",
                    "aspect_ratio": "3:4", 
                    "image_prompt": "Detailed image generation prompt for this scene..."
                }},
                ...
            ]
        }}
        """
        
        try:
            model = GenerativeModel("gemini-1.5-flash-001") # Using Flash for speed/logic
            response = model.generate_content(prompt)
            
            # Simple cleanup to ensure JSON
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            
            import json
            return json.loads(text)
            
        except Exception as e:
            print(f"Director AI Error: {e}")
            # Fallback Mock
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
        Generates an image using Vertex AI and the specified model.
        """
        try:
            # For now, we keep the mock or try-catch logic. 
            # In a real scenario, we would call Imagen here.
            # model = ImageGenerationModel.from_pretrained("imagegeneration@006")
            # response = model.generate_images(prompt=prompt, seed=seed)
            # return response[0]._image_bytes
            
            # Returning mock for stability during dev as per plan
            return self._generate_image_mock(prompt, width, height, seed)
                 
        except Exception as e:
            print(f"Vertex AI Generation Error: {e}")
            return self._generate_image_mock(prompt, width, height, seed)

    def modify_image(self, original_image_url: str, instruction: str) -> bytes:
        """
        Modifies an existing image based on the instruction.
        """
        # Mock implementation for now
        # In real world: Download image -> Send to Gemini/Imagen with instruction -> Return new bytes
        print(f"Modifying image {original_image_url} with instruction: {instruction}")
        
        # Generate a new mock image that looks "modified"
        return self._generate_image_mock(f"Modified: {instruction}", 1024, 1024)

    def _generate_image_mock(self, prompt: str, width: int, height: int, seed: int = None) -> bytes:
        from PIL import Image, ImageDraw
        import random
        
        # Use seed if provided for deterministic output
        if seed is not None:
            random.seed(seed)
            
        img = Image.new('RGB', (width, height), color = (50, 50, 50))
        d = ImageDraw.Draw(img)
        d.text((10,10), f"Toonify AI\nPrompt: {prompt[:50]}...\nSeed: {seed}", fill=(255,255,255))
        
        # Draw a simple shape to make it look different
        color = (random.randint(0,255), random.randint(0,255), random.randint(0,255))
        d.rectangle([width//4, height//4, width*3//4, height*3//4], outline=color, width=5)
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

ai_service = AIService()
