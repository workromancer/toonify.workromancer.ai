import requests
import json
import os

API_URL = "http://localhost:8000/api/v1"

# Try to find a token if needed, or assume no auth for local MVP if not enforced, 
# but endpoints usually require it.
# Actually backend enforce deps.get_current_user. 
# I can try to login as the test user.
# "test@example.com" / "password" ? Or virtual user.

def get_token():
    # Attempt login or use hardcoded if known
    try:
        resp = requests.post(f"{API_URL}/auth/access-token", data={"username": "test@example.com", "password": "password"})
        if resp.status_code == 200:
            return resp.json()["access_token"]
    except:
        pass
    return None

def list_projects():
    # For local dev, maybe I can just query DB directly or use the virtual user header if implemented? 
    # Or assuming I can reuse the token from browser? Hard to get.
    # Let's try to just run the script with a known user/pass or check DB.
    # Easier: Check DB using sqlmodel.
    pass

if __name__ == "__main__":
    # Direct DB access
    from sqlmodel import Session, create_engine, select
    from app.models import Project
    from app.core.config import settings
    
    # Adjust python path if needed
    import sys
    sys.path.append(os.getcwd())
    
    db_url = settings.DATABASE_URL
    if db_url and "asyncpg" in db_url:
        db_url = db_url.replace("+asyncpg", "")
    
    engine = create_engine(db_url)
    with Session(engine) as session:
        projects = session.exec(select(Project)).all()
        for p in projects:
            print(f"{p.title}: {p.id}")
