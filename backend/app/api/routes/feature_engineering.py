from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Any, Dict, List
from app.services.feature_eng_service import get_suggestions, apply_features

router = APIRouter()


class FeatureItem(BaseModel):
    name: str
    formula: str


class ApplyFeaturesRequest(BaseModel):
    features: List[FeatureItem]


@router.get("/{job_id}", response_model=Dict[str, Any])
def get_feature_suggestions(job_id: str):
    """
    Calls the AI provider fallback chain to return 2-4 feature engineering
    suggestions (name, formula, reasoning) based on the dataset's columns.
    This is a live AI call — expect 2-10s latency depending on the active provider.
    """
    try:
        return get_suggestions(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")


@router.post("/{job_id}", response_model=Dict[str, Any])
def apply_feature_suggestions(job_id: str, payload: ApplyFeaturesRequest):
    """
    Accepts a list of {name, formula} pairs, evaluates each formula against the
    stored dataframe using df.eval(), and persists the new columns in session_store.
    Returns the updated column list, shape, and any failures.
    """
    try:
        features_as_dicts = [f.model_dump() for f in payload.features]
        return apply_features(job_id, features_as_dicts)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error applying features: {str(e)}")
