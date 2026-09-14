import io
import pickle
import pandas as pd
from app.core.session_store import store
from app.services.ml_service import get_column_classification
from app.services.codegen_service import generate_api_server_script

def export_model_pkl(job_id: str) -> io.BytesIO:
    artifacts = store.get_model_artifacts(job_id)
    if not artifacts:
        raise ValueError(f"No trained model found for job_id: {job_id}")

    features = artifacts.get("features", [])
    cat_feats = artifacts.get("categorical_features", [])
    _numeric_features = [c for c in features if c not in cat_feats]

    _model_bundle = {
        "model": artifacts.get("model"),
        "feature_names": features,
        "numeric_features": _numeric_features,
        "categorical_features": cat_feats,
        "category_mappings": artifacts.get("category_mappings", {}),
        "encoded_columns": artifacts.get("expected_columns", []),
        "target": artifacts.get("target_column"),
        "problem_type": artifacts.get("problem_type"),
        "best_model_name": artifacts.get("model_name"),
    }
    
    _pkl_bytes = pickle.dumps(_model_bundle)
    return io.BytesIO(_pkl_bytes)

def export_api_script(job_id: str) -> io.BytesIO:
    artifacts = store.get_model_artifacts(job_id)
    if not artifacts:
        raise ValueError(f"No trained model found for job_id: {job_id}")

    df = store.get_df(job_id)
    cc = get_column_classification(df) if df is not None else {"numeric": [], "categorical": []}
    
    features = artifacts.get("features", [])
    X_raw = df[features] if df is not None else pd.DataFrame(columns=features)

    script_content = generate_api_server_script(
        model_name=artifacts.get("model_name", "Model"),
        target=artifacts.get("target_column", "target"),
        problem_type=artifacts.get("problem_type", "regression"),
        features=features,
        cat_feats=artifacts.get("categorical_features", []),
        dummy_columns=artifacts.get("expected_columns", []),
        cc=cc,
        X_raw=X_raw
    )
    
    return io.BytesIO(script_content.encode("utf-8"))
