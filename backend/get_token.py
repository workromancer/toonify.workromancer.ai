from app.core.security import create_access_token
from app.api.deps import engine
from sqlmodel import Session, select
from app.models.models import User
from datetime import timedelta

def get_token():
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "test@example.com")).first()
        if not user:
            print("User not found!")
            return
        
        access_token_expires = timedelta(minutes=60*24)
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )
        print(f"TOKEN={access_token}")

if __name__ == "__main__":
    get_token()
