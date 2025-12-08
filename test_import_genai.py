
try:
    from google import genai
    from google.genai import types
    print("Import Successful")
except ImportError as e:
    print(f"Import Failed: {e}")
