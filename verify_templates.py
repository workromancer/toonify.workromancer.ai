import requests
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_test():
     # 1. Login (Reuse signup logic if needed, but lets assume we can just login with prev user or make new one)
    email = f"test_{int(time.time())}@example.com"
    password = "password123"
    
    # Signup
    requests.post(f"{BASE_URL}/auth/signup", json={"email": email, "password": password, "username": "test"})
    
    # Login
    res = requests.post(f"{BASE_URL}/auth/login/access-token", data={"username": email, "password": password})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Fetch Templates
    print("Fetching templates...")
    res = requests.get(f"{BASE_URL}/templates/", headers=headers)
    if res.status_code == 200:
        templates = res.json()
        print(f"Found {len(templates)} templates.")
        for t in templates:
            print(f"- {t['title']} ({t['style_preset']})")
    else:
        print(f"Failed to fetch templates: {res.text}")

if __name__ == "__main__":
    run_test()
