from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services import export_service

router = APIRouter()

@router.get("/export/model/{job_id}")
def export_model_pkl(job_id: str):
    try:
        pkl_io = export_service.export_model_pkl(job_id)
        return StreamingResponse(
            pkl_io,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=model.pkl"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/code/{job_id}")
def export_api_script(job_id: str):
    try:
        script_io = export_service.export_api_script(job_id)
        return StreamingResponse(
            script_io,
            media_type="text/x-python",
            headers={"Content-Disposition": f"attachment; filename=api_server.py"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
