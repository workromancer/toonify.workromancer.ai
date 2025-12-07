from datetime import datetime
from uuid import UUID
from sqlmodel import Session, select
from fastapi import HTTPException
from app.models.models import Workspace, CreditTransaction

class BillingService:
    # Pricing Matrix (Cost per action) - Could be moved to config/DB later
    PRICING = {
        "director_suggestion": {"free": 1, "plus": 1, "pro": 0, "expert": 0},
        "style_recommendation": {"free": 2, "plus": 2, "pro": 1, "expert": 0},
        "image_generation": {"free": 5, "plus": 5, "pro": 4, "expert": 3},
        "upscale": {"free": 999, "plus": 10, "pro": 8, "expert": 5}, # 999 = locked
    }

    def check_credits(self, session: Session, workspace_id: UUID, action_type: str) -> int:
        """
        Calculates cost and checks if workspace has enough credits.
        Returns the cost if sufficient, raises HTTPException if not.
        """
        workspace = session.get(Workspace, workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        tier = workspace.tier if workspace.tier else "free"
        
        # Get cost
        try:
            cost = self.PRICING[action_type].get(tier, 5) # Default to 5 if tier not found
        except KeyError:
            # Fallback or strict error
            cost = 5 
            
        if cost > workspace.credits:
             raise HTTPException(
                status_code=402, 
                detail=f"Insufficient credits. Required: {cost}, Available: {workspace.credits}"
            )
            
        return cost

    def deduct_credits(self, session: Session, workspace_id: UUID, user_id: UUID, action_type: str) -> Workspace:
        """
        Deducts credits and records transaction.
        """
        cost = self.check_credits(session, workspace_id, action_type)
        
        workspace = session.get(Workspace, workspace_id)
        
        # Deduct
        workspace.credits -= cost
        session.add(workspace)
        
        # Record Transaction
        transaction = CreditTransaction(
            workspace_id=workspace_id,
            user_id=user_id,
            amount=-cost,
            action_type=action_type,
            timestamp=datetime.utcnow()
        )
        session.add(transaction)
        
        session.commit()
        session.refresh(workspace)
        
        return workspace

billing_service = BillingService()
