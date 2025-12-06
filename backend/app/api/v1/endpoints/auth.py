from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.api import deps
from app.core import security
from app.models import User, Workspace, WorkspaceMember
from pydantic import BaseModel, EmailStr

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str # Just for display if needed, but model only has email. Wait, model has no username.
    # Let's check models. User has email, password_hash. No username.
    # We can omit username or add it to DB later. For now, let's use email as ID.

class UserOut(BaseModel):
    id: Any
    email: EmailStr
    
class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/signup", response_model=UserOut)
def create_user(
    *,
    session: Session = Depends(deps.get_session),
    user_in: UserCreate,
) -> Any:
    """
    Create new user without the need to be logged in.
    Also creates a default Workspace.
    """
    user = session.exec(
        select(User).where(User.email == user_in.email)
    ).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    
    # 1. Create User
    user = User(
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # 2. Create Default Workspace
    workspace = Workspace(
        name=f"{user_in.email.split('@')[0]}'s Workspace",
        owner_id=user.id,
        tier="free",
        credits=50
    )
    session.add(workspace)
    session.commit()
    session.refresh(workspace)

    # 3. Add User to Workspace as Member (Role: Owner)
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role="owner"
    )
    session.add(member)
    session.commit()

    return user

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    session: Session = Depends(deps.get_session),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = session.exec(
        select(User).where(User.email == form_data.username)
    ).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = security.create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
