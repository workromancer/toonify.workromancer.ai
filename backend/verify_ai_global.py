from google import genai
import os

PROJECT = "webtoon-factory"
LOCATION = "global" # Testing User's preferred location

print(f"Testing GenAI client with Project: {PROJECT}, Location: {LOCATION}")

try:
    client = genai.Client(
        vertexai=True,
        project=PROJECT,
        location=LOCATION
    )
    
    print("Client initialized. Generating content...")
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents="Hello, confirm you are working in global region."
    )
    print("Response received:")
    print(response.text)
    
except Exception as e:
    print(f"GenAI Error in {LOCATION}: {e}")
