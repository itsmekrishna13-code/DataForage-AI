from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.services.upload_service import handle_file_upload
from app.core.auth import get_current_user_optional
from app.database import get_db
from app.models import UserSession

router = APIRouter()

class UploadResponse(BaseModel):
    job_id: str
    message: str

@router.post("/", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    user: Optional[dict] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Validate file extension
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Unsupported file format.\nPlease upload a CSV (.csv) file.")
    
    # Validate MIME type if available
    if file.content_type and file.content_type not in ["text/csv", "application/vnd.ms-excel"]:
        raise HTTPException(status_code=400, detail="Unsupported file format.\nPlease upload a CSV (.csv) file.")

    job_id = await handle_file_upload(file)
    
    if user:
        user_session = UserSession(
            user_id=user["sub"],
            job_id=job_id,
            filename=file.filename,
            metadata_json="{}"
        )
        db.add(user_session)
        db.commit()
        
    return UploadResponse(job_id=job_id, message="File uploaded successfully")
