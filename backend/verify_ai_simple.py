from google import genai
import os

PROJECT = "toonify-develop"
LOCATION = "global" # Explicitly testing this

print(f"Testing GenAI client with Project: {PROJECT}, Location: {LOCATION}")

try:
    client = genai.Client(
        vertexai=True,
        project=PROJECT,
        location=LOCATION
    )
    
    print("Client initialized. Generating content...")
    response = client.models.generate_content(
        model="gemini-2.5-flash", # Use a cheaper/faster model for connection test first
        contents="Hello, are you working?"
    )
    print("Response received:")
    print(response.text)
    
except Exception as e:
    print(f"GenAI Error: {e}")
