import json
import hashlib
import logging
from typing import Any, Dict, List
from app.core.session_store import store
from app.services.ai_service import AIProviderManager

logger = logging.getLogger(__name__)


def _build_prompt(dtypes_str: str, head_str: str) -> str:
    return (
        "You are a data science expert. Based on the dataset below, suggest 2-4 "
        "engineered features that could improve predictive modeling.\n"
        f"Column names and dtypes:\n{dtypes_str}\n\n"
        f"First 5 rows sample:\n{head_str}\n\n"
        "Return ONLY a raw JSON array of objects. Do not include markdown code fences "
        "(like ```json). Each object must have exactly these keys:\n"
        "- 'name': A short variable name for the new feature.\n"
        "- 'formula': A valid Pandas Eval formula using existing numeric columns "
        "(e.g. 'A / B' or 'A + B * C'). It must use exact column names from the "
        "dataset. DO NOT use column names that contain spaces or special characters "
        "in the formula, or if you must, ensure it is a valid simple arithmetic operation.\n"
        "- 'reasoning': 1 sentence explaining why this helps."
    )


def _parse_ai_response(raw: str) -> List[Dict[str, Any]]:
    clean = raw.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return json.loads(clean.strip())


def get_suggestions(job_id: str) -> Dict[str, Any]:
    """
    Calls the AI provider chain to generate 2-4 feature engineering suggestions
    for the dataset stored under job_id. Returns the suggestions as a JSON list.
    """
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")

    dtypes_str = df.dtypes.to_string()
    head_str = df.head(5).to_string(index=False)
    dataset_hash = hashlib.md5(df.to_csv(index=False).encode("utf-8")).hexdigest()

    prompt = _build_prompt(dtypes_str, head_str)

    ai_mgr = AIProviderManager()
    suggestions = ai_mgr.generate_response(prompt, parser=_parse_ai_response)

    logger.info(
        f"[feature_eng_service] Generated {len(suggestions)} suggestions "
        f"for job_id={job_id} (dataset_hash={dataset_hash[:8]})"
    )

    return {
        "job_id": job_id,
        "dataset_hash": dataset_hash,
        "suggestions": suggestions,
    }


def apply_features(job_id: str, features: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Accepts a list of {name, formula} dicts and evaluates each formula against
    the stored dataframe using df.eval(), adding the result as a new column.
    Updates the dataframe in session_store in place.
    Returns the updated columns list and shape.
    """
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")

    applied: List[str] = []
    failed: List[Dict[str, str]] = []

    for feat in features:
        name = feat.get("name", "").strip()
        formula = feat.get("formula", "").strip()
        if not name or not formula:
            failed.append({"name": name, "formula": formula, "error": "Missing name or formula"})
            continue
        try:
            df[name] = df.eval(formula)
            applied.append(name)
        except Exception as e:
            failed.append({"name": name, "formula": formula, "error": str(e)})

    # Persist the updated dataframe back to session_store
    session = store.get_session(job_id)
    session["df"] = df

    return {
        "job_id": job_id,
        "applied_features": applied,
        "failed_features": failed,
        "new_shape": {"rows": df.shape[0], "columns": df.shape[1]},
        "columns": list(df.columns),
    }
