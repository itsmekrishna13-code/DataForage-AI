import pandas as pd
import numpy as np
from typing import Dict, Any, List
from app.core.session_store import store


def compute_outlier_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute IQR-based outlier bounds and per-column stats.
    Samples up to 10k rows if dataset is large (>20 numeric cols or >50k rows).
    Mirrors the original main.py get_outlier_bounds_and_stats logic.
    """
    num_cols = list(df.select_dtypes(include=np.number).columns)

    sample_df = df
    sampled = False
    if len(num_cols) > 20 or len(df) > 50_000:
        sample_df = df.sample(min(10_000, len(df)), random_state=42)
        sampled = True

    bounds: Dict[str, Dict[str, float]] = {}
    outlier_breakdown: List[Dict[str, Any]] = []
    outlier_score_deduction = 0.0
    outlier_issues: List[str] = []
    outlier_rows_idx: set = set()

    for col in num_cols:
        Q1 = sample_df[col].quantile(0.25)
        Q3 = sample_df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR
        bounds[col] = {"lower": lower, "upper": upper}

        col_outlier_idx = sample_df[
            (sample_df[col] < lower) | (sample_df[col] > upper)
        ].index.tolist()
        outliers_in_sample = len(col_outlier_idx)
        outlier_rows_idx.update(col_outlier_idx)

        if outliers_in_sample > 0:
            pct = outliers_in_sample / len(sample_df)
            est_total = int(pct * len(df)) if sampled else outliers_in_sample
            outlier_breakdown.append({
                "column": col,
                "outlier_count": est_total,
                "outlier_pct": round(pct * 100, 2),
                "lower_bound": lower,
                "upper_bound": upper,
                "estimated": sampled,
            })
            if pct > 0.05:
                outlier_issues.append(col)
                outlier_score_deduction += min(10, pct * 50)

    total_outlier_pct = len(outlier_rows_idx) / len(sample_df) if len(sample_df) > 0 else 0
    total_outliers_count = int(total_outlier_pct * len(df)) if sampled else len(outlier_rows_idx)

    return {
        "bounds": bounds,
        "breakdown": outlier_breakdown,
        "outlier_issues": outlier_issues,
        "outlier_score_deduction": outlier_score_deduction,
        "total_outliers_count": total_outliers_count,
        "sampled": sampled,
        "numeric_columns": num_cols,
    }


def get_outliers(job_id: str) -> Dict[str, Any]:
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")
    stats = compute_outlier_stats(df)
    return {
        "job_id": job_id,
        "total_rows": len(df),
        "total_outliers_count": stats["total_outliers_count"],
        "sampled": stats["sampled"],
        "numeric_columns": stats["numeric_columns"],
        "bounds": stats["bounds"],
        "breakdown": stats["breakdown"],
        "outlier_issues": stats["outlier_issues"],
    }


def remove_outliers(job_id: str) -> Dict[str, Any]:
    """
    Drop all rows that are outliers in ANY numeric column (IQR rule).
    Updates the dataframe in session_store in place.
    """
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")

    stats = compute_outlier_stats(df)
    bounds = stats["bounds"]

    drop_idx: set = set()
    for col, b in bounds.items():
        col_drop = df[(df[col] < b["lower"]) | (df[col] > b["upper"])].index
        drop_idx.update(col_drop)

    rows_before = len(df)
    cleaned_df = df.drop(index=list(drop_idx)).reset_index(drop=True)
    rows_after = len(cleaned_df)

    # Update the session store with the cleaned dataframe
    session = store.get_session(job_id)
    session["df"] = cleaned_df

    return {
        "job_id": job_id,
        "rows_before": rows_before,
        "rows_removed": rows_before - rows_after,
        "rows_after": rows_after,
    }
