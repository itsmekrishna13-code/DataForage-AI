import pandas as pd
import numpy as np
from typing import Dict, Any, List
from app.core.session_store import store
from app.services.outlier_service import compute_outlier_stats


def get_data_quality(job_id: str) -> Dict[str, Any]:
    """
    Returns a 0-100 data quality score plus actionable suggestions.
    Mirrors the original main.py scoring logic exactly:
      - missing_penalty = min(40, missing_pct * 2)
      - dup_penalty     = min(30, dup_pct * 2)
      - outlier_penalty = min(30, outlier_score_deduction)
      - dq_score        = max(0, 100 - sum of penalties)
    """
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")

    rows, cols = df.shape
    total_cells = rows * cols

    # Missing values
    total_missing = int(df.isnull().sum().sum())
    missing_pct = (total_missing / total_cells * 100) if total_cells > 0 else 0.0

    # Duplicates
    dup_count = int(df.duplicated().sum())
    dup_pct = (dup_count / total_cells * 100) if total_cells > 0 else 0.0

    # Outliers (reuse outlier_service logic)
    outlier_stats = compute_outlier_stats(df)
    outlier_score_deduction = outlier_stats["outlier_score_deduction"]
    outlier_issues: List[str] = outlier_stats["outlier_issues"]
    total_outliers = outlier_stats["total_outliers_count"]

    # Penalty calculation (mirrors main.py exactly)
    missing_penalty = min(40.0, missing_pct * 2)
    dup_penalty = min(30.0, dup_pct * 2)
    outlier_penalty = min(30.0, outlier_score_deduction)
    dq_score = max(0.0, 100 - missing_penalty - dup_penalty - outlier_penalty)

    # Score label
    if dq_score >= 80:
        label = "Good"
    elif dq_score >= 50:
        label = "Fair"
    else:
        label = "Poor"

    # Actionable suggestions
    suggestions: List[str] = []
    if missing_pct > 5:
        suggestions.append(
            f"High missing values ({missing_pct:.1f}%) — consider imputation."
        )
    if dup_count > 0:
        suggestions.append(
            f"Found {dup_count} duplicate rows — consider removing them."
        )
    if outlier_issues:
        suggestions.append(
            f"Outliers detected in columns like '{outlier_issues[0]}' — "
            "consider capping or transformation."
        )
    if not suggestions and dq_score >= 80:
        suggestions.append("Dataset looks clean and ready for analysis.")

    return {
        "job_id": job_id,
        "score": round(dq_score, 1),
        "label": label,
        "penalties": {
            "missing_penalty": round(missing_penalty, 2),
            "duplicate_penalty": round(dup_penalty, 2),
            "outlier_penalty": round(outlier_penalty, 2),
        },
        "stats": {
            "rows": rows,
            "columns": cols,
            "total_missing": total_missing,
            "missing_pct": round(missing_pct, 2),
            "duplicate_rows": dup_count,
            "total_outliers": total_outliers,
            "outlier_columns": outlier_issues,
        },
        "suggestions": suggestions,
    }
