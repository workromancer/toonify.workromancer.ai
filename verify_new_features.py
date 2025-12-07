import sys
import os
# Add backend to path
sys.path.append("/Users/workromancer/workromancer-labs/toonify.workromancer.ai/backend")

# Set mock env vars
os.environ["SECRET_KEY"] = "test_secret_key"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "mock_credentials.json"
os.environ["GOOGLE_CLOUD_PROJECT"] = "mock-project"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

from fastapi.testclient import TestClient
from app.main import app
from app.api import deps
from app.models import User, Workspace, WorkspaceMember, Project

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
from app.api import deps
from app.models import User, Workspace, WorkspaceMember, Project, Clue

# --- Mock DB Setup ---
# Use in-memory SQLite for testing
sqlite_file_name = "database.db"
sqlite_url = "sqlite:///:memory:"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args, poolclass=StaticPool)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def override_get_session():
    with Session(engine) as session:
        yield session

def override_get_current_user_id():
    import uuid
    return uuid.UUID("123e4567-e89b-12d3-a456-426614174001")

app.dependency_overrides[deps.get_session] = override_get_session
app.dependency_overrides[deps.get_current_user_id] = override_get_current_user_id

client = TestClient(app)

def setup_test_data():
    import uuid
    with Session(engine) as session:
        # Create Dummy Data
        project = Project(
            id=uuid.UUID("123e4567-e89b-12d3-a456-426614174000"),
            title="Test Project", 
            owner_id=uuid.UUID("123e4567-e89b-12d3-a456-426614174001"), # Assuming user_id is also UUID
            workspace_id=uuid.UUID("123e4567-e89b-12d3-a456-426614174002"),
            style_preset="anime"
        )
        session.add(project)
        session.commit()

def test_clues_flow():
    print("\n--- Testing Clues Flow ---")
    
    # 1. Create a Clue
    print("1. Creating Clue...")
    response = client.post(
        "/api/v1/clues/",
        json={
            "project_id": "123e4567-e89b-12d3-a456-426614174000",
            "description": "The butler did it."
        }
    )
    if response.status_code == 200:
        clue = response.json()
        print(f"   Success! Clue ID: {clue['id']}")
        
        # 2. List Clues
        print("2. Listing Clues...")
        response = client.get("/api/v1/clues/?project_id=123e4567-e89b-12d3-a456-426614174000")
        assert response.status_code == 200
        assert len(response.json()) > 0
        print("   Success! List works.")
        
        # 3. Update Clue
        print("3. Updating Clue...")
        clue_id = clue['id']
        response = client.patch(f"/api/v1/clues/{clue_id}", json={"status": "resolved"})
        assert response.status_code == 200
        assert response.json()['status'] == "resolved"
        print("   Success! Update works.")
        
    else:
        print(f"Failed to create clue: {response.text}")


def test_style_recommendation():
    print("\n--- Testing Style Recommendation ---")
    response = client.post(
        "/api/v1/projects/styles/recommend",
        json={"description": "A dark cyberpunk revenge story"}
    )
    if response.status_code == 200:
        print("Success!")
        print(response.json())
    else:
        print(f"Failed: {response.status_code}")
        print(response.text)

def test_get_project():
    print("\n--- Testing Get Project ---")
    response = client.get("/api/v1/projects/123e4567-e89b-12d3-a456-426614174000")
    if response.status_code == 200:
        data = response.json()
        print(f"   Success! Project: {data['title']}")
        # Verify characters field exists (even if empty)
        assert "characters" in data
        print("   Success! Characters field present.")
    else:
        print(f"Failed to get project: {response.status_code} {response.text}")

if __name__ == "__main__":
    try:
        create_db_and_tables()
        setup_test_data()
        test_get_project()
        test_clues_flow()
        test_style_recommendation()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
