from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.data_quality_service import get_data_quality

router = APIRouter()


@router.get("/{job_id}", response_model=Dict[str, Any])
def data_quality_endpoint(job_id: str):
    try:
        return get_data_quality(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing data quality: {str(e)}")
