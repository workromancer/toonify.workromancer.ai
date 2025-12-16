from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, col
from uuid import UUID

from app.api import deps
from app.models.models import Asset, WorkspaceMember
from app.services.storage import storage
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class AssetOut(BaseModel):
    id: UUID
    filename: str
    file_url: str
    file_type: str
    created_at: datetime
    workspace_id: UUID

@router.get("/", response_model=List[AssetOut])
def list_assets(
    session: Session = Depends(deps.get_session),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    List assets in workspaces the user is a member of.
    """
    # Get workspace IDs member is in
    statement = select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == current_user_id)
    workspace_ids = session.exec(statement).all()
    
    if not workspace_ids:
        return []

    # Get assets in these workspaces
    statement = select(Asset).where(col(Asset.workspace_id).in_(workspace_ids)).order_by(col(Asset.created_at).desc())
    assets = session.exec(statement).all()
    
    return assets

@router.post("", response_model=AssetOut)
async def upload_asset(
    *,
    session: Session = Depends(deps.get_session),
    file: UploadFile = File(...),
    current_user_id: str = Depends(deps.get_current_user_id),
) -> Any:
    """
    Upload an asset to the user's default (first) workspace.
    """
    if not file.content_type.startswith("image/"):
         raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Get user's default workspace (first one)
    ws_statement = select(WorkspaceMember).where(WorkspaceMember.user_id == current_user_id)
    member = session.exec(ws_statement).first()
    
    if not member:
         raise HTTPException(status_code=404, detail="No workspace found for user.")
    
    workspace_id = member.workspace_id
         
    contents = await file.read()
    
    # Upload to storage
    try:
        url = storage.upload_image(contents, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to storage: {str(e)}")
    
    asset = Asset(
        workspace_id=workspace_id,
        user_id=UUID(current_user_id),
        filename=file.filename,
        file_url=url,
        file_type=file.content_type
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)
    
    return asset
