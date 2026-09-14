import pandas as pd
import numpy as np
from typing import Dict, Any
from sklearn.model_selection import train_test_split, cross_val_score
from app.core.session_store import store

def get_column_classification(df: pd.DataFrame) -> Dict[str, list]:
    numeric = []
    categorical = []
    text = []
    date = []
    
    for col, dtype in df.dtypes.items():
        if pd.api.types.is_numeric_dtype(dtype):
            numeric.append(col)
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            date.append(col)
        elif pd.api.types.is_object_dtype(dtype) or isinstance(dtype, pd.CategoricalDtype):
            unique_count = df[col].nunique()
            if unique_count <= 20:
                categorical.append(col)
            else:
                text.append(col)
    
    return {
        "numeric": numeric,
        "categorical": categorical,
        "text": text,
        "date": date
    }

def detect_problem_type(df: pd.DataFrame, target_column: str) -> Dict[str, str]:
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")
        
    target_series = df[target_column].dropna()
    unique_count = target_series.nunique()
    
    if unique_count == 2:
        return {
            "type": "Binary Classification",
            "reasoning": f"The target column '{target_column}' has exactly 2 unique values."
        }
    elif unique_count <= 10 and not pd.api.types.is_float_dtype(target_series):
        return {
            "type": "Multiclass Classification",
            "reasoning": f"The target column '{target_column}' has {unique_count} unique values and is not continuous."
        }
    elif pd.api.types.is_numeric_dtype(target_series):
        return {
            "type": "Regression",
            "reasoning": f"The target column '{target_column}' is numeric and has many unique values."
        }
    else:
        return {
            "type": "Unknown",
            "reasoning": f"The target column '{target_column}' does not fit standard classification or regression."
        }

def train_models(job_id: str, target_column: str, problem_type: str, test_size: float = 0.2, selected_models=None) -> Dict[str, Any]:
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")

    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    cc = get_column_classification(df)
    
    # Exclude ID-like columns (e.g. customer_id, id, uuid) and high-cardinality text/date columns
    id_cols = [c for c in df.columns if c.lower() in ('id', 'uuid') or c.lower().endswith('_id')]
    exclude_cols = set(id_cols) | set(cc.get("text", [])) | set(cc.get("date", [])) | {target_column}
    
    numeric_features = [c for c in cc.get("numeric", []) if c not in exclude_cols]
    categorical_features = [c for c in cc.get("categorical", []) if c not in exclude_cols]
    features = numeric_features + categorical_features

    if not features:
        raise ValueError("No suitable feature columns available to train a model.")

    model_df = df[features + [target_column]].dropna()
    if model_df.empty:
        raise ValueError("No data remaining after dropping missing values.")

    category_mappings = {}
    for col in categorical_features:
        category_mappings[col] = sorted(list(model_df[col].unique()))

    X_raw = model_df[features]
    y = model_df[target_column]
    X = pd.get_dummies(X_raw, columns=categorical_features, drop_first=True)
    expected_columns = list(X.columns)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    large_dataset = len(model_df) > 20_000

    results = []
    best_model_name = ""
    best_model = None

    if problem_type == "classification":
        from sklearn.linear_model import LogisticRegression
        from sklearn.tree import DecisionTreeClassifier
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score

        rf_clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        all_candidates = {
            "Logistic Regression": LogisticRegression(random_state=42, max_iter=1000),
            "Decision Tree": DecisionTreeClassifier(random_state=42),
            "Random Forest": rf_clf,
        }
        # Filter to only the models requested by the caller (if specified)
        if selected_models:
            candidates = {k: v for k, v in all_candidates.items() if k in selected_models}
            if not candidates:
                raise ValueError(f"None of the requested models ({selected_models}) are valid classification models.")
        else:
            candidates = all_candidates

        majority_class = y_train.mode()[0]
        baseline_score = accuracy_score(y_test, [majority_class] * len(y_test))

        min_cc = int(y_train.value_counts().min())
        n_cv_splits = max(2, min(3 if large_dataset else 5, min_cc))

        X_train_cv, y_train_cv = X_train, y_train
        if len(model_df) > 30_000:
            X_train_cv, _, y_train_cv, _ = train_test_split(
                X_train, y_train, train_size=20000, stratify=y_train, random_state=42
            )

        for name, m in candidates.items():
            m.fit(X_train, y_train)
            n_jobs_cv = -1 if hasattr(m, "n_jobs") else 1
            cv = cross_val_score(m, X_train_cv, y_train_cv, cv=n_cv_splits, scoring="accuracy", n_jobs=n_jobs_cv)
            
            y_pred_test = m.predict(X_test)
            test_acc = accuracy_score(y_test, y_pred_test)
            
            results.append({
                "model": name,
                "cvScore": round(cv.mean(), 4),
                "metric": round(test_acc, 4),
                "isBest": False,
                "cvStd": round(cv.std(), 4),
                "Model": name,
                "Test Accuracy": round(test_acc, 4),
                "CV Mean": round(cv.mean(), 4),
                "CV Std Dev": round(cv.std(), 4),
            })
            
        comp_df = pd.DataFrame(results)
        best_idx = comp_df["CV Mean"].idxmax()
        best_model_name = comp_df.loc[best_idx, "Model"]
        results[best_idx]["isBest"] = True
        best_model = candidates[best_model_name]

    elif problem_type == "regression":
        from sklearn.linear_model import LinearRegression
        from sklearn.tree import DecisionTreeRegressor
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.dummy import DummyRegressor
        from sklearn.metrics import mean_absolute_error, r2_score

        rf_reg = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        all_candidates = {
            "Linear Regression": LinearRegression(),
            "Decision Tree": DecisionTreeRegressor(random_state=42),
            "Random Forest": rf_reg,
        }
        # Filter to only the models requested by the caller (if specified)
        if selected_models:
            candidates = {k: v for k, v in all_candidates.items() if k in selected_models}
            if not candidates:
                raise ValueError(f"None of the requested models ({selected_models}) are valid regression models.")
        else:
            candidates = all_candidates

        baseline = DummyRegressor(strategy="mean")
        baseline.fit(X_train, y_train)
        baseline_score = r2_score(y_test, baseline.predict(X_test))

        n_cv_splits = max(2, min(3 if large_dataset else 5, len(X_train)))

        X_train_cv, y_train_cv = X_train, y_train
        if len(model_df) > 30_000:
            X_train_cv, _, y_train_cv, _ = train_test_split(
                X_train, y_train, train_size=20000, random_state=42
            )

        for name, m in candidates.items():
            m.fit(X_train, y_train)
            n_jobs_cv = -1 if hasattr(m, "n_jobs") else 1
            cv = cross_val_score(m, X_train_cv, y_train_cv, cv=n_cv_splits, scoring="r2", n_jobs=n_jobs_cv)
            
            y_pred_test = m.predict(X_test)
            test_r2 = r2_score(y_test, y_pred_test)
            test_mae = mean_absolute_error(y_test, y_pred_test)
            
            results.append({
                "model": name,
                "cvScore": round(cv.mean(), 4),
                "metric": round(test_r2, 4),
                "isBest": False,
                "cvStd": round(cv.std(), 4),
                "Model": name,
                "Test R2": round(test_r2, 4),
                "Test MAE": round(test_mae, 4),
                "CV Mean": round(cv.mean(), 4),
                "CV Std Dev": round(cv.std(), 4),
            })
            
        comp_df = pd.DataFrame(results)
        best_idx = comp_df["CV Mean"].idxmax()
        best_model_name = comp_df.loc[best_idx, "Model"]
        results[best_idx]["isBest"] = True
        best_model = candidates[best_model_name]
    else:
        raise ValueError(f"Unsupported problem_type: {problem_type}")

    classification_report_list = None
    if problem_type == "classification":
        from sklearn.metrics import classification_report
        y_pred = best_model.predict(X_test)
        report_dict = classification_report(y_test, y_pred, output_dict=True)
        classification_report_list = []
        for class_label, metrics in report_dict.items():
            if class_label == 'accuracy':
                continue
            classification_report_list.append({
                "label": str(class_label),
                "precision": round(metrics.get("precision", 0.0), 4),
                "recall": round(metrics.get("recall", 0.0), 4),
                "f1": round(metrics.get("f1-score", 0.0), 4),
                "support": int(metrics.get("support", 0))
            })

    feature_importance_list = []
    try:
        if hasattr(best_model, "feature_importances_"):
            importances = best_model.feature_importances_
            for col, imp in zip(X.columns, importances):
                feature_importance_list.append({
                    "feature": col,
                    "importance": float(imp)
                })
        elif hasattr(best_model, "coef_"):
            coefs = best_model.coef_
            if len(coefs.shape) > 1:
                coefs = np.mean(np.abs(coefs), axis=0)
            else:
                coefs = np.abs(coefs)
            
            total = np.sum(coefs) if np.sum(coefs) > 0 else 1.0
            for col, val in zip(X.columns, coefs):
                feature_importance_list.append({
                    "feature": col,
                    "importance": float(val / total)
                })
        feature_importance_list = sorted(feature_importance_list, key=lambda x: x["importance"], reverse=True)
    except Exception as e:
        print(f"Error computing feature importance: {e}")

    X_train_bg = X_train.sample(min(100, len(X_train)), random_state=42)
    X_test_sample = X_test.sample(min(1000, len(X_test)), random_state=42)

    store.save_model_artifacts(job_id, {
        "model": best_model,
        "model_name": best_model_name,
        "features": features,
        "categorical_features": categorical_features,
        "category_mappings": category_mappings,
        "expected_columns": expected_columns,
        "target_column": target_column,
        "problem_type": problem_type,
        "X_train_bg": X_train_bg,
        "X_test_sample": X_test_sample,
        "feature_importance": feature_importance_list,
        "classification_report": classification_report_list
    })

    # Save to version history in session store
    session = store.get_session(job_id)
    if session is not None:
        if "training_history" not in session:
            session["training_history"] = []
        
        import datetime
        version_num = len(session["training_history"]) + 1
        
        best_res = next((r for r in results if r["Model"] == best_model_name), results[0])
        cv_score = best_res.get("CV Mean", 0.0)
        metric = best_res.get("Test Accuracy", best_res.get("Test R2", 0.0))
        
        session["training_history"].insert(0, {
            "version": f"v{version_num}",
            "model": best_model_name,
            "features": len(features),
            "cvScore": cv_score,
            "metric": metric,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    return {
        "baseline_score": round(baseline_score, 4),
        "best_model_name": best_model_name,
        "n_cv_splits": n_cv_splits,
        "results": results,
        "problem_type": problem_type,
        "problemType": problem_type,
        "classification_report": classification_report_list,
        "classificationReport": classification_report_list,
        "feature_importance": feature_importance_list,
        "featureImportance": feature_importance_list
    }

def predict(job_id: str, input_data: Dict[str, Any]) -> Any:
    artifacts = store.get_model_artifacts(job_id)
    if not artifacts:
        raise ValueError(f"No trained model found for job_id: {job_id}")

    model = artifacts["model"]
    features = artifacts["features"]
    categorical_features = artifacts["categorical_features"]
    expected_columns = artifacts["expected_columns"]

    input_df = pd.DataFrame([input_data])
    
    # Fill missing features with default/median values from training data
    X_train_bg = artifacts.get("X_train_bg")
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

    prediction = model.predict(input_encoded)[0]
    
    if hasattr(prediction, 'item'):
        prediction = prediction.item()

    # Calculate confidence if the model supports it
    confidence = 1.0
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(input_encoded)[0]
        # For binary classification prediction is typically 0 or 1
        # In multiclass/binary, index with the predicted class int if it fits
        try:
            confidence = float(proba[int(prediction)])
        except Exception:
            confidence = float(max(proba))

    # Calculate contributions using SHAP
    contributions = []
    try:
        from app.services.shap_service import get_prediction_shap
        shap_res = get_prediction_shap(job_id, input_data)
        feat_names = shap_res.get("feature_names", [])
        shap_vals = shap_res.get("values", [])
        for feat, val in zip(feat_names, shap_vals):
            contributions.append({
                "feature": feat,
                "value": float(val)
            })
    except Exception as e:
        # Fallback if SHAP fails: set empty or construct uniform dummy contributions
        pass

    return {
        "value": prediction,
        "confidence": confidence,
        "contributions": contributions
    }
