from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import UserSession
from app.core.auth import get_current_user
import json

router = APIRouter()

@router.get("/history")
def get_user_history(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(UserSession).filter(UserSession.user_id == user["sub"]).order_by(UserSession.created_at.desc()).all()
    
    result = []
    for s in sessions:
        meta = {}
        if s.metadata_json:
            try:
                meta = json.loads(s.metadata_json)
            except:
                pass
        
        result.append({
            "id": s.id,
            "job_id": s.job_id,
            "filename": s.filename,
            "created_at": s.created_at.isoformat(),
            "metadata": meta
        })
        
    return result
