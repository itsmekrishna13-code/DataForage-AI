from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
import json
from app.services.ml_service import train_models, predict, get_column_classification, detect_problem_type
from app.services.ai_service import suggest_target, generate_insights, generate_chart
from app.core.session_store import store
from app.core.auth import get_current_user_optional
from app.database import get_db
from app.models import UserSession
router = APIRouter()

class TrainRequest(BaseModel):
    target_column: str
    problem_type: Optional[str] = None   # auto-detected if omitted
    test_size: float = 0.2               # fraction of data for test split (e.g. 0.2 = 20%)
    models: Optional[List[str]] = None  # subset of models to train; None means train all

class ChartRequest(BaseModel):
    prompt: str

class TrainResponse(BaseModel):
    baseline_score: float
    best_model_name: str
    n_cv_splits: int
    results: list[Dict[str, Any]]
    problem_type: Optional[str] = None
    problemType: Optional[str] = None
    classification_report: Optional[list[Dict[str, Any]]] = None
    classificationReport: Optional[list[Dict[str, Any]]] = None
    feature_importance: Optional[list[Dict[str, Any]]] = None
    featureImportance: Optional[list[Dict[str, Any]]] = None

@router.post("/train/{job_id}", response_model=TrainResponse)
def train_endpoint(
    job_id: str, 
    payload: TrainRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        # Auto-detect problem_type from the data when not supplied by the caller
        problem_type = payload.problem_type
        if not problem_type:
            df = store.get_df(job_id)
            if df is None:
                raise HTTPException(status_code=404, detail="Session not found for job_id")
            detected = detect_problem_type(df, payload.target_column)
            raw_type = detected.get("type", "").lower()
            problem_type = "regression" if "regression" in raw_type else "classification"
        results = train_models(
            job_id,
            payload.target_column,
            problem_type,
            test_size=payload.test_size,
            selected_models=payload.models,
        )
        
        if user:
            user_session = db.query(UserSession).filter(UserSession.job_id == job_id, UserSession.user_id == user["sub"]).first()
            if user_session:
                meta = {}
                if user_session.metadata_json:
                    try:
                        meta = json.loads(user_session.metadata_json)
                    except:
                        pass
                meta["target_column"] = payload.target_column
                meta["best_model"] = results.get("best_model_name")
                meta["baseline_score"] = results.get("baseline_score")
                meta["problem_type"] = problem_type
                user_session.metadata_json = json.dumps(meta)
                db.commit()
                
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during training: {str(e)}")

@router.get("/model-info/{job_id}")
def get_model_info_endpoint(job_id: str):
    artifacts = store.get_model_artifacts(job_id)
    if not artifacts:
        return {"trained": False}
    return {
        "trained": True,
        "features": artifacts.get("features", []),
        "categorical_features": artifacts.get("categorical_features", []),
        "category_mappings": artifacts.get("category_mappings", {}),
        "target_column": artifacts.get("target_column"),
        "problem_type": artifacts.get("problem_type"),
        "problemType": artifacts.get("problem_type")
    }

@router.post("/predict/{job_id}")
def predict_endpoint(job_id: str, input_data: Dict[str, Any] = Body(...)):
    try:
        return predict(job_id, input_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during prediction: {str(e)}")

@router.get("/columns/classify/{job_id}")
def classify_columns_endpoint(job_id: str):
    df = store.get_df(job_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found for job_id")
    try:
        return get_column_classification(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error classifying columns: {str(e)}")

@router.get("/problem-type/{job_id}")
def problem_type_endpoint(job_id: str, target_column: str):
    df = store.get_df(job_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found for job_id")
    try:
        return detect_problem_type(df, target_column)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting problem type: {str(e)}")

@router.get("/target/suggest/{job_id}")
def suggest_target_endpoint(job_id: str):
    df = store.get_df(job_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found for job_id")
    try:
        res = suggest_target(df)
        session = store.get_session(job_id)
        if session:
            session["suggested_target"] = res.get("target_column")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error suggesting target: {str(e)}")


@router.get("/history/{job_id}")
def get_history_endpoint(job_id: str):
    session = store.get_session(job_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found for job_id")
    return session.get("training_history", [])


@router.get("/insights/{job_id}")
def get_insights_endpoint(job_id: str):
    df = store.get_df(job_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found for job_id")
    try:
        return generate_insights(df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

@router.post("/chat-to-chart/{job_id}")
def chat_to_chart_endpoint(job_id: str, payload: ChartRequest):
    df = store.get_df(job_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found for job_id")
    try:
        return generate_chart(df, payload.prompt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating chart: {str(e)}")
