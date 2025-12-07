import requests
import time
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_test():
    email = f"ai_test_{int(time.time())}@example.com"
    password = "password123"
    
    # 1. Signup & Login
    print("1. Signup")
    requests.post(f"{BASE_URL}/auth/signup", json={"email": email, "password": password, "username": "aitester"})
    res = requests.post(f"{BASE_URL}/auth/login/access-token", data={"username": email, "password": password})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. ALREADY HAPPENS: User created default workspace.

    # 3. Create Project
    print("3. Create Project")
    res = requests.post(f"{BASE_URL}/projects/", json={"title": "RAG Project", "style_preset": "anime"}, headers=headers)
    project = res.json()
    project_id = project["id"]
    
    # 4. Create Episode
    print("4. Create Episode")
    res = requests.post(f"{BASE_URL}/episodes/", json={"project_id": project_id, "title": "Ep 1", "episode_order": 1}, headers=headers)
    if res.status_code != 200:
        print(f"Failed to create episode: {res.text}")
        return
    episode = res.json()
    episode_id = episode["id"]
    
    # 5. Create StoryCut (Should trigger Embedding Generation)
    print("5. Create Cut (Triggers Embedding)")
    cut_data = {
        "episode_id": episode_id,
        "cut_order": 1,
        "script": "A hero standing on a cliff looking at sunset.", # Script for embedding
        "selected_layout": "single"
    }
    res = requests.post(f"{BASE_URL}/cuts/", json=cut_data, headers=headers)
    if res.status_code == 200:
        print("Cut Created.")
    else:
        print(f"Failed to create cut: {res.text}")
        
    # 6. Generate Scene Structure (Should trigger RAG Retrieval)
    print("6. Generate Structure (Triggers RAG)")
    # We use a script similar to the previous one to see if RAG catches it (though we can't see internal logs easily, success means no crash)
    rag_req = {
        "script": "A warrior watching the sun go down.",
        "project_id": project_id
    }
    res = requests.post(f"{BASE_URL}/scenes/structure", json=rag_req, headers=headers)
    if res.status_code == 200:
        print("Structure Generation Successful.")
        print(json.dumps(res.json(), indent=2))
    else:
        print(f"Structure Gen Failed: {res.text}")

if __name__ == "__main__":
    run_test()
