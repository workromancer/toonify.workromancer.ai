from google import genai
from google.genai import types
from app.core.config import settings
import io
import base64
import requests
import json
import re
from typing import List, Optional
import os

class AIService:
    def __init__(self):
        # Initialize Google GenAI Client
        try:
            api_key = settings.GEMINI_API_KEY or os.environ.get("GOOGLE_CLOUD_API_KEY")
            project = settings.GOOGLE_CLOUD_PROJECT or os.environ.get("GOOGLE_CLOUD_PROJECT")
            location = settings.GOOGLE_CLOUD_LOCATION
            
            print(f"AI Service: Initializing for project '{project}' in '{location}'")
            
            if not api_key:
                print(f"Info: No API Key found. Attempting to use Application Default Credentials (ADC) for project '{project}'.")
            
            self.client = genai.Client(
                vertexai=True,
                project=project,
                location=location,
                api_key=api_key # Can be None for ADC
            )
            # Models Configuration (Ref: AI_MODELS.md)
            self.model_config = {
                "style": "gemini-2.5-flash",
                "worldview": "gemini-3-pro-preview",
                "director": "gemini-3-pro-preview",
                "image": "gemini-3-pro-image-preview",
                "embedding": "gemini-embedding-001"
            } 
        except Exception as e:
            print(f"GenAI Client Init Failed: {e}")
            self.client = None

    def _clean_json_text(self, text: str) -> str:
        """Cleans markdown code blocks from JSON string."""
        if not text:
            return "{}"
        # Remove ```json and ```
        text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'```\s*$', '', text, flags=re.MULTILINE)
        return text.strip()

    def recommend_style(self, description: str) -> dict:
        if not self.client:
            print("AI Service (Mock): Recommending styles")
            return {
                "options": [
                    {
                        "id": "mock_style_1",
                        "label": "Mock Webtoon Style",
                        "description": "A vibrant and dynamic style perfect for action.",
                        "sample_image_url": "https://placehold.co/400x300?text=Style+1"
                    },
                    {
                        "id": "mock_style_2",
                        "label": "Mock Noir",
                        "description": "High contrast, dark atmosphere.",
                        "sample_image_url": "https://placehold.co/400x300?text=Style+2"
                    },
                    {
                        "id": "mock_style_3",
                        "label": "Mock Watercolor",
                        "description": "Soft, dreamy aesthetic.",
                        "sample_image_url": "https://placehold.co/400x300?text=Style+3"
                    }
                ]
            }

        # ... real implementation ...
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
                model=self.model_config["style"],
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text)
            
        except Exception as e:
            print(f"Style Director Error: {e}")
            # Fallback for verification
            return {
                "options": [
                    {
                        "id": "mock_style_1",
                        "label": "Mock Webtoon Style",
                        "description": "A vibrant and dynamic style perfect for action.",
                        "sample_image_url": "https://placehold.co/400x300?text=Style+1"
                    },
                    {
                        "id": "mock_style_2",
                        "label": "Mock Noir",
                        "description": "High contrast, dark atmosphere.",
                        "sample_image_url": "https://placehold.co/400x300?text=Style+2"
                    },
                     {
                        "id": "mock_style_3",
                        "label": "Mock Watercolor",
                        "description": "Soft, dreamy aesthetic.",
                        "sample_image_url": "https://placehold.co/400x300?text=Style+3"
                    }
                ]
            }

    def augment_worldview(self, description: str, title: str = None, subtitle: str = None, genres: List[str] = None) -> dict:

             
        context_str = ""
        if title:
            context_str += f"\nProject Title: {title}"
        if subtitle:
            context_str += f"\nSubtitle: {subtitle}"
        if genres:
            context_str += f"\nGenres: {', '.join(genres)}"
            
        desc_str = f'"{description}"' if description else "(None provided, suggest based on project context)"
        
        if not self.client:
            print("AI Service (Mock): Augmenting Worldview")
            return {
                "options": [
                    {
                        "id": "mock_wv_1",
                        "title": "Mock World 1",
                        "tone": "Dark / Serious",
                        "key_features": ["Feature A", "Feature B"],
                        "description": "A mocked worldview description.",
                        "content": "This is a detailed mock description of the worldview. The sun never sets, and machines rule."
                    },
                    {
                        "id": "mock_wv_2",
                        "title": "Mock World 2",
                        "tone": "Light / Funny",
                        "key_features": ["Feature C", "Feature D"],
                        "description": "Another mocked worldview.",
                        "content": "This is another detailed mock description. Everyone is a cat."
                    }
                ]
            }

        prompt = f"""
        You are an expert fantasy/sci-fi world builder.
        Based on the following worldview description and project context, create 3 distinct directions/variations for this world.
        Each option should have a catchy title, a short summary, and a detailed enhanced description.
        
        Project Context:{context_str}
        
        Original Description: {desc_str}
        
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
                model=self.model_config["worldview"],
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Worldview Augmentation Error: {e}. Returning Mocks.")
            return {
                "options": [
                    {
                        "id": "mock_wv_1",
                        "title": "Mock World 1",
                        "tone": "Dark / Serious",
                        "key_features": ["Feature A", "Feature B"],
                        "description": "A mocked worldview description.",
                        "content": "This is a detailed mock description of the worldview. The sun never sets, and machines rule."
                    },
                    {
                        "id": "mock_wv_2",
                        "title": "Mock World 2",
                        "tone": "Light / Funny",
                        "key_features": ["Feature C", "Feature D"],
                        "description": "Another mocked worldview.",
                        "content": "This is another detailed mock description. Everyone is a cat."
                    }
                ]
            }

    def augment_character_text(self, name: str, tags: List[str], mood: str, style: str) -> dict:
        if not self.client:
            print("AI Service (Mock): Augmenting Character")
            return {
                "augmented_tags": ["heroic", "brave", "detailed"],
                "visual_description": f"A highly detailed character design for {name}, emphasizing {mood} mood.",
                "personality_hint": "Determination and courage."
            }

        prompt = f"""
        You are a character design expert for {style} webtoons.
        Enhance the following character concept into a detailed visual description and tags.
        
        Name: {name}
        Initial Tags: {', '.join(tags) if tags else 'None'}
        Mood: {mood}
        
        Return ONLY a JSON object:
        {{
            "augmented_tags": ["tag1", "tag2", ...],
            "visual_description": "Detailed visual description for image generation...",
            "personality_hint": "Brief personality note"
        }}
        """
        try:
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
            print(f"Character Augment Error: {e}. Returning Mocks.")
            return {
                "augmented_tags": ["heroic", "brave", "detailed"],
                "visual_description": f"A highly detailed character design for {name}, emphasizing {mood} mood.",
                "personality_hint": "Determination and courage."
            }

    def generate_character_sheet(self, name: str, description: str, style: str) -> bytes:


        prompt = f"""
        Create a Character Reference Sheet for a {style} webtoon character named {name}.
        
        Character Description:
        {description}
        
        Composition Requirements:
        - Split the image vertically or arrange clearly.
        - LEFT HALF: A high-quality detailed Portrait/Headshot of the character's face (showing expression).
        - RIGHT HALF: Full body view (Front view, and if possible partial Back view) to show the costume and body type.
        - Background: Neutral, simple (white or grey) to focus on the design.
        - Style: {style} (High quality, professional concept art).
        """
        # Using a landscape-ish ratio to fit both aspects comfortably
        return self.generate_image(prompt, width=1536, height=1024) 

    def generate_direction_options(self, script: str, character_context: str = "") -> dict:


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

    def generate_image(self, prompt: str, width: int = 1024, height: int = 1024, seed: int = None) -> bytes:
        if not self.client:
            print(f"AI Service (Mock): Generating Image for '{prompt[:20]}...'")
            # Return 1x1 transparent PNG or similar placeholder
            # Base64 for 1x1 red pixel for visibility: iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwMIQAAAABJRU5ErkJggg==
            return base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwMIQAAAABJRU5ErkJggg==")


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
            
            print(f"Generating image with prompt: {prompt[:50]}..., ratio: {aspect_ratio}")
            
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'], 
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                )
            )

            response = self.client.models.generate_content(
                model=self.model_config["image"],
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
            print(f"GenAI Generation Error: {e}. Returning Placeholder.")
            return base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwMIQAAAABJRU5ErkJggg==")

    def modify_image(self, original_image_url: str, instruction: str) -> bytes:


        print(f"Modifying image with instruction: {instruction}")
        
        try:
            # 1. Retrieve Image Bytes
            img_bytes = None
            if original_image_url.startswith("data:image"):
                # Decode Base64
                try:
                    header, encoded = original_image_url.split(",", 1)
                    img_bytes = base64.b64decode(encoded)
                except Exception:
                    # Maybe it's raw base64?
                    img_bytes = base64.b64decode(original_image_url)
            elif original_image_url.startswith("http"):
                # Download
                res = requests.get(original_image_url)
                if res.status_code == 200:
                    img_bytes = res.content
                else:
                     raise Exception(f"Failed to download image: {res.status_code}")
            else:
                 raise Exception("Invalid image URL format")
            
            if not img_bytes:
                raise Exception("Could not retrieve source image bytes")

            # 2. Call GenAI
            image_part = types.Part.from_bytes(data=img_bytes, mime_type="image/png") 
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
                    aspect_ratio="1:1" 
                )
            )

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

    def generate_project_cover_async(self, project_id: str, title: str, genre: str, worldview: str, style: str):
        return self.generate_project_cover_image(title, genre, worldview, style)

    def generate_character_sheet_async(self, character_id: str, name: str, description: str, style: str):
        return self.generate_character_sheet(name, description, style)

    def generate_project_cover_image(self, title: str, genre: str, worldview: str, style: str) -> bytes:


        prompt = f"""
        Create a high-quality webtoon cover illustration.
        
        Title: {title}
        Genre: {genre}
        Art Style: {style}
        
        Worldview/Setting:
        {worldview}
        
        Requirements:
        - The image should be eye-catching and representative of the genre and story.
        - Use the user-defined art style: {style}.
        - Aspect Ratio: Wide (21:9 or 16:9).
        - Composition: Cinematic, showing the atmosphere.
        - No text overlay.
        """
        
        # Requesting 16:9 as it's standard wide
        return self.generate_image(prompt, width=1920, height=1080) 

    def generate_episode_ideas(self, project_title: str, worldview: str, recent_episodes: str) -> dict:
        if not self.client:
            print("AI Service (Mock): Generating Episode Ideas")
            return {
                "options": [
                    {
                        "title": "Mock Episode 1: The Beginning",
                        "summary": "Our hero realizes they are in a simulation.",
                        "reason": "Classic trope twist."
                    },
                    {
                        "title": "Mock Episode 2: The Glitch",
                        "summary": "A strange cat appears where it shouldn't.",
                        "reason": "Adds mystery."
                    },
                    {
                        "title": "Mock Episode 3: System Reboot",
                        "summary": "The world goes dark for 10 seconds.",
                        "reason": "High stakes event."
                    }
                ]
            }
             
        prompt = f"""
        You are a webtoon writer.
        Project: {project_title}
        Worldview: {worldview}
        Recent Episodes: {recent_episodes}
        
        Propose 3 distinct episode ideas for the next chapter.
        Return ONLY JSON:
        {{
            "options": [
                {{
                    "title": "Title",
                    "summary": "Brief summary",
                    "reason": "Why this is interesting"
                }},
                ...
            ]
        }}
        """
        try:
            response = self.client.models.generate_content(
                model=self.model_config["worldview"],
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Episode Idea Gen Failed: {e}. Returning Mocks.")
            return {
                "options": [
                    {
                        "title": "Mock Episode 1: The Beginning",
                        "summary": "Our hero realizes they are in a simulation.",
                        "reason": "Classic trope twist."
                    },
                    {
                        "title": "Mock Episode 2: The Glitch",
                        "summary": "A strange cat appears where it shouldn't.",
                        "reason": "Adds mystery."
                    },
                    {
                        "title": "Mock Episode 3: System Reboot",
                        "summary": "The world goes dark for 10 seconds.",
                        "reason": "High stakes event."
                    }
                ]
            }

    def generate_initial_cuts(self, episode_title: str, summary: str, style: str, num_cuts: int = 6) -> List[dict]:
        if not self.client:
            print("AI Service (Mock): Generating Initial Cuts")
            cuts = []
            for i in range(1, num_cuts + 1):
                cuts.append({
                    "cut_order": i,
                    "script": f"Mock visual description for cut {i}. Action happening here.",
                    "dialogues": [{"speaker": "Hero", "text": f"Line for cut {i}"}],
                    "panel_type": "Wide" if i % 2 == 0 else "Square"
                })
            return cuts

        prompt = f"""
        Plan a {num_cuts}-cut webtoon episode.
        Title: {episode_title}
        Summary: {summary}
        Style: {style}
        
        For each cut, determine:
        - Script (Visual Description of action/scene)
        - Dialogues (List of {{speaker, text}})
        - Panel Type (Wide, Vertical, Square)
        
        Return ONLY JSON:
        {{
            "cuts": [
                {{
                    "cut_order": 1,
                    "script": "Visual description...",
                    "dialogues": [{{"speaker": "A", "text": "Hello"}}],
                    "panel_type": "Wide"
                }},
                ...
            ]
        }}
        """
        try:
            response = self.client.models.generate_content(
                model=self.model_config["director"],
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            cleaned_text = self._clean_json_text(response.text)
            return json.loads(cleaned_text).get("cuts", [])
        except Exception as e:
            print(f"Cut Gen Failed: {e}. Returning Mocks.")
            cuts = []
            for i in range(1, num_cuts + 1):
                cuts.append({
                    "cut_order": i,
                    "script": f"Mock visual description for cut {i}. Action happening here.",
                    "dialogues": [{"speaker": "Hero", "text": f"Line for cut {i}"}],
                    "panel_type": "Wide" if i % 2 == 0 else "Square"
                })
            return cuts


ai_service = AIService()
