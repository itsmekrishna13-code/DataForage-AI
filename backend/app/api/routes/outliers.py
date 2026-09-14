from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.services.outlier_service import get_outliers, remove_outliers

router = APIRouter()


@router.get("/{job_id}", response_model=Dict[str, Any])
def get_outliers_endpoint(job_id: str):
    """
    Returns IQR-based outlier detection results per numeric column:
    bounds, per-column counts/percentages, and total estimate.
    """
    try:
        return get_outliers(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting outliers: {str(e)}")


@router.post("/{job_id}", response_model=Dict[str, Any])
def remove_outliers_endpoint(job_id: str):
    """
    Drops all outlier rows (IQR rule across all numeric columns) from the
    stored dataframe in session_store. Returns the updated shape.
    """
    try:
        return remove_outliers(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing outliers: {str(e)}")
