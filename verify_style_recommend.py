import requests
import json

API_URL = "http://localhost:8000/api/v1"
# Login not strictly needed for this endpoint based on checking code? 
# endpoints/projects.py: recommend_styles has `current_user_id: str = Depends(deps.get_current_user_id)`
# So we need a token.

EMAIL = "test@example.com"
PASSWORD = "password"

def login():
    try:
        response = requests.post(f"{API_URL}/auth/login/access-token", data={"username": EMAIL, "password": PASSWORD})
        if response.status_code == 200:
            return response.json()["access_token"]
    except:
        pass
    
    # Try register
    requests.post(f"{API_URL}/auth/signup", json={"email": EMAIL, "password": PASSWORD, "full_name": "Test User"})
    response = requests.post(f"{API_URL}/auth/login/access-token", data={"username": EMAIL, "password": PASSWORD})
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def verify_style_recommend():
    token = login()
    if not token:
        print("Failed to login")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    print("Requesting style recommendations...")
    response = requests.post(
        f"{API_URL}/projects/styles/recommend", 
        json={"description": "A cyberpunk city with neon lights"},
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print("Response received:")
        print(json.dumps(data, indent=2))
        
        # Check structure
        if "options" in data:
            print("CONFIRMED: Backend returns 'options'. Frontend fix should work.")
            for opt in data["options"]:
                print(f"  - {opt.get('label')}: {opt.get('sample_image_url')}")
        elif "styles" in data:
            print("CONFIRMED: Backend returns 'styles'. Frontend fix handles this too.")
        elif isinstance(data, list):
             print("CONFIRMED: Backend returns list. Frontend fix handles this too.")
        else:
            print("WARNING: Unexpected structure.")
            
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    verify_style_recommend()
