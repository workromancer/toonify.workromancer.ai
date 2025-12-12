import requests
import os

# Configuration
API_URL = "http://localhost:8000/api/v1"
# Login credentials - using virtual user if available or creating one
EMAIL = "test@example.com"
PASSWORD = "password"

def login():
    # Try to login first
    try:
        response = requests.post(f"{API_URL}/auth/login/access-token", data={"username": EMAIL, "password": PASSWORD})
        if response.status_code == 200:
            return response.json()["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
    
    # If login fails, maybe register (or assume virtual login handles it if implemented, but standard register is safer for test)
    # For now, let's assume a user exists or virtual login works. 
    # If the user mentioned "Virtual User Login" earlier, maybe I should use that.
    # Let's try to register if login fails.
    print("Login failed, trying to register...")
    response = requests.post(f"{API_URL}/auth/signup", json={"email": EMAIL, "password": PASSWORD, "full_name": "Test User"})
    if response.status_code == 200 or response.status_code == 400: # 400 might mean already exists
         response = requests.post(f"{API_URL}/auth/login/access-token", data={"username": EMAIL, "password": PASSWORD})
         if response.status_code == 200:
            return response.json()["access_token"]
    
    print(f"Could not login. Status: {response.status_code}, Body: {response.text}")
    return None

def verify_style_update():
    token = login()
    if not token:
        print("Failed to get access token")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a project
    project_data = {
        "title": "Style Test Project",
        "style_preset": "anime_webtoon"
    }
    response = requests.post(f"{API_URL}/projects/", json=project_data, headers=headers)
    if response.status_code != 200:
        print(f"Failed to create project: {response.text}")
        return
    
    project = response.json()
    project_id = project["id"]
    print(f"Created project {project_id} with style: {project['style_preset']}")

    # 2. Update style
    new_style = "shonen_manga"
    reference_url = "https://example.com/style.png"
    update_data = {
        "style_preset": new_style,
        "style_reference_url": reference_url
    }
    response = requests.patch(f"{API_URL}/projects/{project_id}", json=update_data, headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to update project: {response.text}")
        return
    
    updated_project = response.json()
    print(f"Updated project style to: {updated_project['style_preset']}")
    print(f"Updated project reference URL to: {updated_project.get('style_reference_url')}")

    if updated_project["style_preset"] == new_style and updated_project.get("style_reference_url") == reference_url:
        print("SUCCESS: Style and reference URL updated correctly.")
    else:
        print(f"FAILURE: Mismatch. Expected {new_style} / {reference_url}")

if __name__ == "__main__":
    verify_style_update()
