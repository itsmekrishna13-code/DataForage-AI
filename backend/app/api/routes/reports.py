from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from sqlalchemy.orm import Session
import json
from app.services import report_service
from app.core.auth import get_current_user_optional
from app.database import get_db
from app.models import UserSession

router = APIRouter()

@router.get("/report/{job_id}")
def download_pdf_report(
    job_id: str,
    user: Optional[dict] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        pdf_io = report_service.generate_pdf_report(job_id)
        
        if user:
            user_session = db.query(UserSession).filter(UserSession.job_id == job_id, UserSession.user_id == user["sub"]).first()
            if user_session:
                meta = {}
                if user_session.metadata_json:
                    try:
                        meta = json.loads(user_session.metadata_json)
                    except:
                        pass
                meta["has_report"] = True
                user_session.metadata_json = json.dumps(meta)
                db.commit()
                
        return StreamingResponse(
            pdf_io, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename=dataset_analysis_report_{job_id}.pdf"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notebook/{job_id}")
def download_jupyter_notebook(job_id: str):
    try:
        nb_io = report_service.generate_jupyter_notebook(job_id)
        return StreamingResponse(
            nb_io, 
            media_type="application/x-ipynb+json", 
            headers={"Content-Disposition": f"attachment; filename=DataForge_AI_Analysis_{job_id}.ipynb"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
