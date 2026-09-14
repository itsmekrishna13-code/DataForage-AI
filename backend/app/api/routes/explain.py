from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.services.shap_service import get_global_shap, get_prediction_shap

router = APIRouter()

@router.get("/global/{job_id}")
def global_shap_endpoint(job_id: str):
    try:
        results = get_global_shap(job_id)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating global SHAP: {str(e)}")

@router.post("/predict/{job_id}")
def predict_shap_endpoint(job_id: str, input_data: Dict[str, Any] = Body(...)):
    try:
        results = get_prediction_shap(job_id, input_data)
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating prediction SHAP: {str(e)}")
