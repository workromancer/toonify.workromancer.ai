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
from app.services.storage import storage

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
                "style": "gemini-3-flash-preview",
                "worldview": "gemini-3-flash-preview",
                "director": "gemini-2.5-pro",
                "image": "gemini-3-pro-image-preview",
                "embedding": "gemini-embedding-001",
                "lite": "gemini-2.5-flash-lite",
                "analysis": "gemini-3-flash-preview"
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

    def recommend_style(self, description: str, language: str = "en") -> dict:
        if not self.client:
             raise Exception("AI Service not initialized provided")

        # ... real implementation ...
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
                        img_bytes = self.generate_image(image_prompt, width=768, height=1024) # 3:4 ratio approx
                        
                        if img_bytes:
                            url = storage.upload_image(img_bytes)
                            option["sample_image_url"] = url
                    except Exception as e:
                        print(f"Failed to generate sample for {style_label}: {e}")
                        # Leave sample_image_url empty so frontend uses its clean fallback
        except Exception as e:
            print(f"Error in recommend_style: {e}")
            # Fallback
            return {"options": []}
            
        return parsed_json

    def augment_style_description(self, current_prompt: str, project_context: dict = None, language: str = "en") -> str:
        if not self.client:
             raise Exception("AI Service not initialized provided")
             
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


    def augment_worldview(self, description: str, title: str = None, subtitle: str = None, genres: List[str] = None, language: str = "en") -> dict:

             
        context_str = ""
        if title:
            context_str += f"\nProject Title: {title}"
        if subtitle:
            context_str += f"\nSubtitle: {subtitle}"
        if genres:
            context_str += f"\nGenres: {', '.join(genres)}"
            
        desc_str = f'"{description}"' if description else "(None provided, suggest based on project context)"
        
        if not self.client:
             raise Exception("AI Service not initialized")

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

    # Updated signature to accept List[str] explicitly, or Union handled by type hint if we import Union
    # But for cleaner code let's just assume simple type or check instance
    def augment_character_text(self, name: str, tags: List[str], mood: list | str, style: str, project_context: str = "", language: str = "en") -> dict:
        if not self.client:
             raise Exception("AI Service not initialized")

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

    def generate_character_sheet(self, name: str, description: str, style: str, style_ref_url: str = None) -> bytes:

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
        """
        
        try:
             # Prepare Multimodal Input
            prompt, parts = self._prepare_multimodal_inputs(prompt, style_ref_url)

            # If we have any image inputs, use multimodal generation
            if parts:
                 print(f"Generating multimodal character sheet with {len(parts)} images.")
                 text_part = types.Part.from_text(text=prompt)
                 
                 contents = [
                    types.Content(
                        role="user",
                        parts=parts + [text_part] # Images first, then text
                    )
                 ]
                 
                 config = types.GenerateContentConfig(
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

        # Using 9:16 ratio for vertical character sheet (576x1024)
        return self.generate_image(prompt, width=576, height=1024) 

    def generate_direction_options(self, script: str, character_context: str = "", language: str = "en") -> dict:


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


    def generate_image(self, prompt: str, width: int = 1024, height: int = 1024, seed: int = None, language: str = "en") -> bytes:
        if not self.client:
             raise Exception("AI Service not initialized")


        try:
            # Aspect Ratio logic
            ratio = width / height
            aspect_ratio = "1:1"
            if abs(ratio - 3/4) < 0.01:
                aspect_ratio = "3:4"
            elif abs(ratio - 9/16) < 0.01:
                aspect_ratio = "9:16"
            elif abs(ratio - 4/3) < 0.01:
                aspect_ratio = "4:3"
            elif abs(ratio - 16/9) < 0.01:
                aspect_ratio = "16:9"
            
            print(f"Generating image with prompt: {prompt[:50]}..., ratio: {aspect_ratio}")
            
            # Inject language instruction for image generation
            if language and language.startswith('ko'):
                prompt += " (Any text inside the image must be in Korean Hangul)"
            
            # Safety Settings for creative generation
            safety_settings = [
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH",
                    threshold="BLOCK_ONLY_HIGH"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_ONLY_HIGH"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold="BLOCK_ONLY_HIGH"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT",
                    threshold="BLOCK_ONLY_HIGH"
                )
            ]

            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'], 
                safety_settings=safety_settings,
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                )
            )

            print(f"DEBUG PROMPT [generate_image]: \n{prompt}")
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
                    if part.text:
                        print(f"Model refused to generate image. Reason/Message: {part.text}")
                        raise Exception(f"Model refusal: {part.text}")
            
            print(f"No image returned. Prompt feedback: {response.prompt_feedback}")
            raise Exception("No image part found in response")
                  
        except Exception as e:
            print(f"GenAI Generation Error: {e}")
            raise e

    def modify_image(self, original_image_url: str, instruction: str, language: str = "en") -> bytes:


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
            
            lang_instruction = f" Ensure any text is in {language}." if language else ""
            text_part = types.Part.from_text(text=f"Edit this image: {instruction}{lang_instruction}")
            
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

    def _download_image(self, url: str) -> bytes:
        if not url:
            return None
        try:
            if url.startswith("data:image"):
                # Decode Base64
                try:
                    header, encoded = url.split(",", 1)
                    return base64.b64decode(encoded)
                except Exception:
                    # Maybe it's raw base64?
                    return base64.b64decode(url)
            elif url.startswith("http"):
                # Download
                res = requests.get(url)
                if res.status_code == 200:
                    return res.content
                else:
                     print(f"Failed to download image from {url}: {res.status_code}")
                     return None
            return None
        except Exception as e:
            print(f"Error downloading image: {e}")
            return None

    def _prepare_multimodal_inputs(self, prompt: str, style_ref_url: str = None, character_image_urls: List[str] = None) -> tuple[str, List[types.Part]]:
        """
        Helper to prepare prompt and image parts for multimodal generation.
        Returns (updated_prompt, parts_list)
        """
        parts = []
        
        # 1. Style Reference
        if style_ref_url:
            print(f"Using style reference image: {style_ref_url}")
            ref_img_bytes = self._download_image(style_ref_url)
            if ref_img_bytes:
                parts.append(types.Part.from_bytes(data=ref_img_bytes, mime_type="image/png"))
                prompt += "\nIMPORTANT: Mimic the art style of the first provided image exactly."

        # 2. Character Images
        if character_image_urls:
            print(f"Using {len(character_image_urls)} character reference images.")
            for idx, url in enumerate(character_image_urls):
                    char_bytes = self._download_image(url)
                    if char_bytes:
                        parts.append(types.Part.from_bytes(data=char_bytes, mime_type="image/png"))
                        prompt += f"\n[Reference Image {len(parts)}] is a main character. Include them."
        
        return prompt, parts

    def generate_project_cover_image(self, title: str, genre: str, worldview: str, style: str, tones: List[str] = None, style_ref_url: str = None, character_image_urls: List[str] = None, language: str = "en") -> bytes:

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

            # If we have any image inputs, use multimodal generation
            if parts:
                 print(f"Generating multimodal cover with {len(parts)} images.")
                 text_part = types.Part.from_text(text=prompt)
                 
                 contents = [
                    types.Content(
                        role="user",
                        parts=parts + [text_part] # Images first, then text
                    )
                 ]
                 
                 config = types.GenerateContentConfig(
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

        # Requesting 16:9 as it's standard wide
        return self.generate_image(prompt, width=1920, height=1080) 

    def generate_episode_ideas(self, project_title: str, worldview: str, recent_episodes: str, language: str = "en") -> dict:
        if not self.client:
             raise Exception("AI Service not initialized")
             
        prompt = f"""
        You are a webtoon writer.
        Project: {project_title}
        Worldview: {worldview}
        Recent Episodes: {recent_episodes}
        
        {f'IMPORTANT: All output text (titles, summaries, reasons) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

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

    def generate_initial_cuts(self, episode_title: str, summary: str, style: str, num_cuts: int = 6, language: str = "en") -> List[dict]:
        if not self.client:
             raise Exception("AI Service not initialized")

        prompt = f"""
        Plan a {num_cuts}-cut webtoon episode.
        Title: {episode_title}
        Summary: {summary}
        Style: {style}
        
        For each cut, determine:
        - Script (Visual Description of action/scene)
        - Dialogues (List of {{speaker, text}})
        - Panel Type (Wide, Vertical, Square)
        - Appearing Characters (List of character names appearing in this cut, MAX 6)
        
        {f'IMPORTANT: All output text (scripts, dialogues, character names) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul for scripts, dialogues, and appearing characters(names).' if language and language.startswith('ko') else ''}

        Return ONLY JSON:
        {{
            "cuts": [
                {{
                    "cut_order": 1,
                    "script": "Visual description...",
                    "dialogues": [{{"speaker": "A", "text": "Hello"}}],
                    "appearing_characters": ["Character A", "Character B"],
                    "panel_type": "Wide"
                }},
                ...
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
            return json.loads(cleaned_text).get("cuts", [])
        except Exception as e:
            print(f"Cut Gen Failed: {e}")
            raise e
    def get_character_suggestion(self, suggestion_type: str, project_context: str, current_data: dict, language: str = "en") -> dict:
        """
        Generates character suggestions based on project context using a lightweight model.
        """
        if not self.client:
             raise Exception("AI Service not initialized")

        # Use style/analysis model as primary for suggestions (gemini-3-flash-preview)
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



    def generate_character_batch_suggestions(self, project_context: str, count: int = 10, language: str = "en") -> dict:
        """
        Generates a batch of distinct character concepts.
        """
        if not self.client:
             raise Exception("AI Service not initialized")

        prompt = f"""
        You are a casting director for a Webtoon.
        Project Context:
        {project_context}
        
        Create {count} distinct, interesting character concepts that could fit into this story.
        They should vary in age, role, personality, and appearance.
        Exclude the Protagonist if already defined (assume these are potential additional cast members).
        
        {f'IMPORTANT: All output text (names, roles, bios) MUST be in {language} language.' if language else ''}
        {f'If language is Korean, use Hangul.' if language and language.startswith('ko') else ''}

        Return ONLY a JSON object:
        {{
            "suggestions": [
                {{
                    "name": "Name",
                    "age": "Age (e.g. 19)",
                    "role": "Role (e.g. Rival, Best Friend)", 
                    "visual_keywords": ["tag1", "tag2"], 
                    "personality": "Personality summary...",
                    "bio": "Brief background...",
                }},
                ...
            ]
        }}
        """
        try:
            print(f"DEBUG PROMPT [batch_suggestions]: \n{prompt}")
            response = self.client.models.generate_content(
                model=self.model_config["worldview"], # Use smarter model for creative batch
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

    def analyze_character_concept(self, project_context: str, name: str, age: str, visual_keywords: List[str], personality: str, language: str = "en") -> dict:
        """
        Analyzes the character concept and suggests a Role (Archetype) and Lore.
        Uses gemini-3-flash-preview for speed and reasoning.
        """
        # Using configured analysis model.
        
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



    def generate_panel_image(self, 
                             prompt: str, 
                             width: int = 1024, 
                             height: int = 1024, 
                             style_ref_url: str = None, 
                             character_data: List[dict] = None, 
                             prev_scene_url: str = None,
                             language: str = "en") -> bytes:
        """
        Generates a webtoon panel with maximum context:
        - Style Reference (Project Style)
        - Character References (Visual consistency)
        - Previous Scene (Visual consistency)
        """
        if not self.client:
             raise Exception("AI Service not initialized")

        # 1. Base Text Prompt Construction
        full_prompt = f"""
        Create a high-quality webtoon panel.
        
        Scene Description:
        {prompt}
        
        Requirements:
        - Match the art style of the provided Style Reference (if any).
        - Maintain visual consistency with the Previous Scene (if any).
        - Include the specific characters provided (if mentioned in scene).
        {f'- Any speech bubbles or text in the image MUST be in {language}.' if language and language.startswith('ko') else ''}
        """
        
        try:
            parts = []
            
            # 2. Add Style Reference
            if style_ref_url:
                print(f"Adding Style Reference: {style_ref_url}")
                style_bytes = self._download_image(style_ref_url)
                if style_bytes:
                    parts.append(types.Part.from_bytes(data=style_bytes, mime_type="image/png"))
                    full_prompt += "\n[Reference Image 1] is the ART STYLE. Mimic it exactly."

            # 3. Add Previous Scene (for continuity)
            if prev_scene_url:
                print(f"Adding Previous Scene: {prev_scene_url}")
                prev_bytes = self._download_image(prev_scene_url)
                if prev_bytes:
                    parts.append(types.Part.from_bytes(data=prev_bytes, mime_type="image/png"))
                    full_prompt += f"\n[Reference Image {len(parts)}] is the PREVIOUS SCENE. Maintain continuity (lighting, colors, environment)."

            # 4. Add Characters
            if character_data:
                print(f"Adding {len(character_data)} Character References")
                for char in character_data:
                    c_url = char.get("url")
                    c_name = char.get("name")
                    if c_url:
                        c_bytes = self._download_image(c_url)
                        if c_bytes:
                            parts.append(types.Part.from_bytes(data=c_bytes, mime_type="image/png"))
                            full_prompt += f"\n[Reference Image {len(parts)}] is character '{c_name}'. Include them if relevant to the scene."

            # 5. Determine Aspect Ratio
            ratio_val = width / height
            aspect_ratio = "1:1"
            if abs(ratio_val - 3/4) < 0.01: aspect_ratio = "3:4"
            elif abs(ratio_val - 9/16) < 0.01: aspect_ratio = "9:16"
            elif abs(ratio_val - 4/3) < 0.01: aspect_ratio = "4:3"
            elif abs(ratio_val - 16/9) < 0.01: aspect_ratio = "16:9"

            # 6. Call API
            print(f"Generating Panel with {len(parts)} images. Ratio: {aspect_ratio}")
            
            text_part = types.Part.from_text(text=full_prompt)
            
            contents = [
                types.Content(
                    role="user",
                    parts=parts + [text_part] # Images first
                )
            ]
            
            config = types.GenerateContentConfig(
                response_modalities=['IMAGE'], 
                image_config=types.ImageConfig(aspect_ratio=aspect_ratio)
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
            # Fallback
            return self.generate_image(prompt, width, height, language=language)

ai_service = AIService()
