from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship, JSON

# --- Associations ---
class WorkspaceMember(SQLModel, table=True):
    workspace_id: UUID = Field(foreign_key="workspace.id", primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", primary_key=True)
    role: str = "member"  # owner, admin, member

# --- Core Models ---

class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    workspaces: List["Workspace"] = Relationship(back_populates="members", link_model=WorkspaceMember)

class Workspace(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    owner_id: UUID  # Creator/Primary Owner
    tier: str = "free"
    credits: int = 50
    created_at: datetime = Field(default_factory=datetime.utcnow)

    members: List[User] = Relationship(back_populates="workspaces", link_model=WorkspaceMember)
    projects: List["Project"] = Relationship(back_populates="workspace")
    transactions: List["CreditTransaction"] = Relationship(back_populates="workspace")

class CreditTransaction(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspace.id")
    user_id: UUID
    amount: int
    action_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    workspace: Workspace = Relationship(back_populates="transactions")

class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    title: str
    workspace_id: UUID = Field(foreign_key="workspace.id")
    owner_id: UUID
    style_preset: str
    thumbnail_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Workspace = Relationship(back_populates="projects")
    characters: List["Character"] = Relationship(back_populates="project")
    episodes: List["Episode"] = Relationship(back_populates="project")
    clues: List["Clue"] = Relationship(back_populates="project")

class Character(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="project.id")
    name: str
    appearance_tags: List[str] = Field(sa_column=Field(default=[], sa_type=JSON))
    default_mood: str
    consistency_seed: int
    profile_image_url: Optional[str] = None
    height_cm: Optional[int] = None
    body_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    project: Project = Relationship(back_populates="characters")

class Episode(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="project.id")
    title: str
    story_summary: Optional[str] = None
    episode_order: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

    project: Project = Relationship(back_populates="episodes")
    cuts: List["StoryCut"] = Relationship(back_populates="episode")

class StoryCut(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    episode_id: UUID = Field(foreign_key="episode.id")
    cut_order: int
    script: str
    selected_layout: str
    aspect_ratio: str
    image_path: Optional[str] = None
    dialogues: List[dict] = Field(default=[], sa_column=Field(sa_type=JSON)) # JSON List of {speaker, text}
    # For RAG, pgvector would be used here, but for SQLModel we might need raw SQL or specific type
    # Skipping vector definition in model for now, handled via raw migration or dedicated table
    created_at: datetime = Field(default_factory=datetime.utcnow)

    episode: Episode = Relationship(back_populates="cuts")

class Clue(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="project.id")
    description: str
    status: str = "active" # active, resolved
    created_episode_id: Optional[UUID] = None
    resolved_episode_id: Optional[UUID] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    project: Project = Relationship(back_populates="clues")
