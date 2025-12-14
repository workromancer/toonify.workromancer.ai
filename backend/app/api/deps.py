from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlmodel import Session, create_engine
from app.core.config import settings
from app.core import security

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/access-token"
)

engine = create_engine(settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql"), echo=True)

def get_session():
    with Session(engine) as session:
        yield session

def get_current_user_id(
    token: str = Depends(reusable_oauth2)
) -> str:
    try:
        payload = jwt.decode(
            token, security.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = payload.get("sub")
    except (JWTError, ValidationError) as e:
        if settings.DEBUG:
            print(f"JWT Validation Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: {e}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data

def get_current_active_user(
    session: Session = Depends(get_session),
    user_id: str = Depends(get_current_user_id),
) -> "User":
    from app.models import User
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # For now, we don't have is_active field, assuming all users are active
    return user

