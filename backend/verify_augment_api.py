import requests
import uuid
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = f"test_{uuid.uuid4()}@example.com"
PASSWORD = "password"

def run_test():
    print(f"Testing with user: {EMAIL}")
    
    # 1. Signup
    print("1. Signing up...")
    signup_resp = requests.post(f"{BASE_URL}/auth/signup", json={"email": EMAIL, "password": PASSWORD, "username": "Tester"})
    if signup_resp.status_code != 200:
        print(f"Signup failed: {signup_resp.status_code} {signup_resp.text}")
        return
    print("Signup successful.")

    # 2. Login
    print("2. Logging in...")
    login_resp = requests.post(f"{BASE_URL}/auth/login/access-token", data={"username": EMAIL, "password": PASSWORD})
    if login_resp.status_code != 200:
        print(f"Login failed: {login_resp.status_code} {login_resp.text}")
        return
    
    token = login_resp.json()["access_token"]
    print(f"Login successful. Token obtained.")
    
    # 3. Call Augment API
    print("3. Calling Augment Worldview API...")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "description": "A cyberpunk city ruled by cats.",
        "title": "Neon Purr",
        "subtitle": "Nine Lives",
        "genres": ["Sci-Fi", "Comedy"]
    }
    
    try:
        augment_resp = requests.post(f"{BASE_URL}/projects/worldview/augment", json=payload, headers=headers)
        
        if augment_resp.status_code == 200:
            print("Augmentation Successful!")
            print(augment_resp.json())
        else:
            print(f"Augmentation Failed: {augment_resp.status_code}")
            print(augment_resp.text)
            
    except Exception as e:
        print(f"Request Error: {e}")

if __name__ == "__main__":
    run_test()
