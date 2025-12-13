
import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"
# Assuming we have a way to authenticate or use a test user
# Since I cannot easily log in via script without tokens, I will try to use the python client code directly 
# OR use the 'test_auth_simple.py' pattern if available.
# But 'test_auth_simple.py' is local.

# Let's write a python script that uses the internal app code (as in verify_ai_simple.py) to bypass HTTP auth for testing logic
# or use requests if the server is running.
# The user said "./dev.sh" is running. So localhost:8000 might be up.

# However, using internal code is more reliable for me since I don't have the token.
# I will use `backend/verify_genre_update_internal.py` using `app.core.db` etc.

import sys
import os
sys.path.append(os.getcwd())

from sqlmodel import Session, select
from app.api.deps import engine
from app.models import Project, Genre, User, Workspace, WorkspaceMember
from app.api.v1.endpoints.projects import update_project, ProjectUpdate
from fastapi import BackgroundTasks

def verify_genre_flow():
    with Session(engine) as session:
        # 1. ensure a genre exists
        genre = session.exec(select(Genre)).first()
        if not genre:
            genre = Genre(name="TestGenre")
            session.add(genre)
            session.commit()
            session.refresh(genre)
        
        print(f"Using Genre: {genre.name} ({genre.id})")

        # 2. Find a user (owner)
        user = session.exec(select(User)).first()
        if not user:
            print("No user found. Seed db first.")
            return
            
        # 3. Find a workspace
        ws_member = session.exec(select(WorkspaceMember).where(WorkspaceMember.user_id == user.id)).first()
        if not ws_member:
             print("No workspace found for user.")
             return
             
        # 4. Create a project WITHOUT genre
        project = Project(
            title="Test Project No Genre",
            workspace_id=ws_member.workspace_id,
            owner_id=user.id,
            style_preset="anime"
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        print(f"Created Project: {project.id}, Genre: {project.genre}, Worldview: {project.worldview}")

        # 5. Try to update genre via logic in update_project
        # We need to simulate the call.
        # update_project takes dependencies. We can just call the logic manually to test ORM behavior.
        
        # Logic from update_project:
        # project_data = project_in.dict(exclude_unset=True)
        # ...
        # setattr(project, key, value)
        
        print("Updating genre...")
        project.genre_id = genre.id
        project.worldview = {"content": "A detailed worldview", "tone": ["Dark"]}
        
        session.add(project)
        session.commit()
        session.refresh(project)
        
        # 6. Check if genre is loaded
        print(f"Updated Project: {project.id}")
        print(f"Genre ID: {project.genre_id}")
        print(f"Genre Rel: {project.genre}")
        
        if project.genre and project.genre.name == genre.name:
            print("SUCCESS: Genre relationship loaded correctly.")
        else:
            print("FAILURE: Genre relationship NOT loaded.")
            
        # Clean up
        session.delete(project)
        session.commit()

if __name__ == "__main__":
    verify_genre_flow()
