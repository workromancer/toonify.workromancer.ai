# Reload trigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Init DB
    from sqlmodel import Session, select, SQLModel, text
    from app.api.deps import engine
    from app.models.models import User, Workspace, WorkspaceMember, ProjectTemplate
    from app.core.security import get_password_hash
    
    # Enable pgvector extension
    try:
        with Session(engine) as session:
            session.exec(text("CREATE EXTENSION IF NOT EXISTS vector"))
            session.commit()
    except Exception as e:
        print(f"Warning: Could not enable pgvector extension: {e}")

    # Create tables if they don't exist
    SQLModel.metadata.create_all(engine)
    
    try:
        with Session(engine) as session:
            user = session.exec(select(User).where(User.email == "test@example.com")).first()
            if not user:
                print("Seeding test user...")
                hashed_pw = get_password_hash("password")
                user = User(email="test@example.com", password_hash=hashed_pw)
                session.add(user)
                session.commit()
                session.refresh(user)
                
                # Create default workspace
                workspace = Workspace(name="Test Workspace", owner_id=user.id)
                session.add(workspace)
                session.commit()
                session.refresh(workspace)
                
                # Link member
                member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner")
                session.add(member)
                session.commit()
                print("Test user seeded: test@example.com / password")
            else:
                print("Test user already exists.")
    except Exception as e:
        print(f"Seeding failed: {e}")
        
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Set all CORS enabled origins
# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# if settings.BACKEND_CORS_ORIGINS:
#     app.add_middleware(
#         CORSMiddleware,
#         allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
#         allow_credentials=True,
#         allow_methods=["*"],
#         allow_headers=["*"],
#     )

@app.get("/")
def root():
    return {"message": "Welcome to Toonify API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
