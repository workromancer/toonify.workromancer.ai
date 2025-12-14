import requests
import os

PROJECT_ID = "0e85ef8f-355b-4baf-9524-71fd414b2f5a"
BASE_URL = "http://localhost:8000/api/v1"
HEADERS = {
    # Assuming user ID 1 or getting a fresh token would be needed, 
    # but for local dev with no auth enabled/mocked, we test if it's open.
    # Note: frontend connects to backend. If frontend fails with 403, backend likely rejected it.
}

print(f"Testing access to project {PROJECT_ID}...")

response = requests.get(f"{BASE_URL}/projects/{PROJECT_ID}", headers=HEADERS)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
