import shap
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from app.core.session_store import store

def get_shap_explainer(model, X_bg, model_name):
    if "Tree" in model_name or "Forest" in model_name:
        explainer = shap.TreeExplainer(model)
    else:
        if "Linear" in model_name or "Logistic" in model_name:
            explainer = shap.LinearExplainer(model, X_bg)
        else:
            explainer = shap.Explainer(model, X_bg)
    return explainer

def get_global_shap(job_id: str) -> Dict[str, Any]:
    artifacts = store.get_model_artifacts(job_id)
    if not artifacts:
        raise ValueError(f"No trained model found for job_id: {job_id}")

    model = artifacts["model"]
    model_name = artifacts["model_name"]
    X_train_bg = artifacts["X_train_bg"]
    X_test_sample = artifacts["X_test_sample"]

    explainer = get_shap_explainer(model, X_train_bg, model_name)
    shap_values = explainer(X_test_sample)

    values = shap_values.values
    
    if len(values.shape) == 3:
        if values.shape[2] == 2:
            importance = np.abs(values[:, :, 1]).mean(axis=0)
        else:
            importance = np.abs(values).mean(axis=(0, 2))
    else:
        importance = np.abs(values).mean(axis=0)
    
    data_array = shap_values.data if hasattr(shap_values, 'data') and shap_values.data is not None else X_test_sample.values

    vals_list = values.tolist() if isinstance(values, np.ndarray) else values
    data_list = data_array.tolist() if isinstance(data_array, np.ndarray) else data_array
    
    return {
        "feature_names": shap_values.feature_names if hasattr(shap_values, 'feature_names') and shap_values.feature_names is not None else list(X_test_sample.columns),
        "mean_importance": importance.tolist() if isinstance(importance, np.ndarray) else importance,
        "values": vals_list,
        "data": data_list
    }

def get_prediction_shap(job_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
    artifacts = store.get_model_artifacts(job_id)
    if not artifacts:
        raise ValueError(f"No trained model found for job_id: {job_id}")

    model = artifacts["model"]
    model_name = artifacts["model_name"]
    features = artifacts["features"]
    categorical_features = artifacts["categorical_features"]
    expected_columns = artifacts["expected_columns"]
    X_train_bg = artifacts["X_train_bg"]

    input_df = pd.DataFrame([input_data])
    
    # Fill missing features with default/median values from training data
    for col in features:
        if col not in input_df.columns:
            if X_train_bg is not None and col in X_train_bg.columns:
                input_df[col] = X_train_bg[col].median()
            else:
                input_df[col] = 0
                
    input_df = input_df[features] 
    input_encoded = pd.get_dummies(input_df, columns=categorical_features, drop_first=True)
    
    for col in expected_columns:
        if col not in input_encoded.columns:
            input_encoded[col] = False
    
    input_encoded = input_encoded[expected_columns]

    explainer = get_shap_explainer(model, X_train_bg, model_name)
    shap_values = explainer(input_encoded)

    values = shap_values.values[0]
    base_values = shap_values.base_values[0]
    data_array = shap_values.data[0] if hasattr(shap_values, 'data') and shap_values.data is not None else input_encoded.values[0]

    if isinstance(values, np.ndarray) and len(values.shape) > 1:
        if values.shape[1] == 2:
            values = values[:, 1]
            base_values = base_values[1] if hasattr(base_values, '__getitem__') else base_values
        else:
            values = values[:, 0]
            base_values = base_values[0] if hasattr(base_values, '__getitem__') else base_values

    return {
        "feature_names": shap_values.feature_names if hasattr(shap_values, 'feature_names') and shap_values.feature_names is not None else list(input_encoded.columns),
        "base_value": base_values.item() if hasattr(base_values, 'item') else base_values,
        "values": values.tolist() if isinstance(values, np.ndarray) else values,
        "data": data_array.tolist() if isinstance(data_array, np.ndarray) else data_array
    }
