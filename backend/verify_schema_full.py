from sqlmodel import Session, select, SQLModel
from app.api.deps import engine
from app.models.models import User, Workspace, WorkspaceMember, Project, Genre, Asset, Episode
from app.core.security import get_password_hash
from uuid import uuid4

def verify():
    # Reset DB for schema verification since we have breaking changes and no migration needed
    print("Resetting Database...")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        print("Starting verification...")
        
        # 1. Create Genre
        genre_name = f"Fantasy_{uuid4().hex[:4]}"
        print(f"Creating Genre: {genre_name}")
        genre = Genre(name=genre_name, description="Magic and dragons")
        session.add(genre)
        session.commit()
        session.refresh(genre)
        print(f"Genre created: {genre.id}")

        # 2. Get/Create User
        user = session.exec(select(User).where(User.email == "test@example.com")).first()
        if not user:
            user = User(email="test@example.com", password_hash=get_password_hash("password"))
            session.add(user)
            session.commit()
            session.refresh(user)
        
        # 3. Get/Create Workspace
        ws_member = session.exec(select(WorkspaceMember).where(WorkspaceMember.user_id == user.id)).first()
        if ws_member:
            workspace_id = ws_member.workspace_id
        else:
            workspace = Workspace(name="Test WS", owner_id=user.id)
            session.add(workspace)
            session.commit()
            session.refresh(workspace)
            workspace_id = workspace.id
            member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
            session.add(member)
            session.commit()
        
        # 4. Create Asset (Mock)
        asset = Asset(
            workspace_id=workspace_id,
            user_id=user.id,
            filename="cover.png",
            file_url="http://mock.url/cover.png",
            file_type="image/png"
        )
        session.add(asset)
        session.commit()
        session.refresh(asset)
        print(f"Asset created: {asset.id}")

        # 5. Create Project with Genre and Asset
        project = Project(
            title="Schema Test Project",
            genre_id=genre.id,
            workspace_id=workspace_id,
            owner_id=user.id,
            style_preset="anime_webtoon",
            worldview={"content": "A test world", "tone": ["Dark", "Epic"]},
            thumbnail_asset_id=asset.id,
            cover_image_asset_id=asset.id
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        print(f"Project created: {project.id}")
        
        # 6. Verify Relationships
        assert project.genre.id == genre.id
        assert project.genre.name == genre_name
        assert project.thumbnail_asset_id == asset.id
        # Note: Accessing relationships works if they are eager loaded or session is active.
        # SQLModel relationships are descriptors.
        
        print("Relationships verified!")
        
        # 7. Check simple query
        p_fetched = session.get(Project, project.id)
        print(f"Fetched Project Genre Name: {p_fetched.genre.name}")
        print(f"Fetched Project Tone: {p_fetched.worldview.get('tone')}")
        
        assert "Dark" in p_fetched.worldview.get("tone")
        
        print("Verification Successful!")

if __name__ == "__main__":
    verify()
