import pandas as pd
from typing import Dict, Any
from app.core.session_store import store

def perform_eda(job_id: str) -> Dict[str, Any]:
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")
        
    rows, cols = df.shape
    
    missing_values = df.isnull().sum().to_dict()
    total_missing = int(df.isnull().sum().sum())
    missing_pct = round((total_missing / (rows * cols)) * 100, 2) if rows * cols > 0 else 0
    
    duplicate_rows = int(df.duplicated().sum())
    
    column_info = {col: str(dtype) for col, dtype in df.dtypes.items()}
    
    try:
        describe_stats = df.describe().to_dict()
    except Exception:
        describe_stats = {}

    return {
        "job_id": job_id,
        "shape": {"rows": rows, "columns": cols},
        "missing_values": {
            "total": total_missing,
            "percentage": missing_pct,
            "by_column": missing_values
        },
        "duplicate_rows": duplicate_rows,
        "column_info": column_info,
        "basic_statistics": describe_stats
    }

def get_visualizations(job_id: str) -> Dict[str, Any]:
    import numpy as np
    from app.services.ml_service import get_column_classification
    
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")
    
    cc = get_column_classification(df)
    
    target_col = None
    artifacts = store.get_model_artifacts(job_id)
    if artifacts:
        target_col = artifacts.get("target_column")
    
    if not target_col:
        session = store.get_session(job_id)
        if session:
            target_col = session.get("suggested_target")
            
    if target_col and target_col not in df.columns:
        target_col = None

    target_type = None
    if target_col:
        if target_col in cc.get("numeric", []):
            target_type = "numeric"
        elif target_col in cc.get("categorical", []):
            target_type = "categorical"

    top_by_target = []
    if target_col:
        if artifacts:
            try:
                from app.services.shap_service import get_global_shap
                global_shap = get_global_shap(job_id)
                names = global_shap.get("feature_names", [])
                importances = global_shap.get("mean_importance", [])
                pairs = sorted(zip(names, importances), key=lambda x: x[1], reverse=True)[:10]
                top_by_target = [{"name": n, "value": float(i)} for n, i in pairs]
            except Exception:
                pass
                
        if not top_by_target:
            try:
                corr = df.corr(numeric_only=True)[target_col].abs().dropna()
                corr = corr.drop(index=target_col, errors='ignore')
                id_cols = [c for c in corr.index if c.lower() in ('id', 'uuid') or c.lower().endswith('_id')]
                corr = corr.drop(index=id_cols, errors='ignore')
                top_10 = corr.sort_values(ascending=False).head(10)
                top_by_target = [{"name": str(k), "value": float(v)} for k, v in top_10.items()]
            except Exception:
                pass

    distribution = []
    num_cols = df.select_dtypes(include='number').columns
    if len(num_cols) > 0:
        dist_col = "age" if "age" in num_cols else num_cols[0]
        if target_col and dist_col == target_col and len(num_cols) > 1:
            dist_col = [c for c in num_cols if c != target_col][0]
            
        series = df[dist_col].dropna()
        if not series.empty:
            counts, bins = np.histogram(series, bins=10)
            for i in range(len(counts)):
                bin_label = f"{bins[i]:.0f}-{bins[i+1]:.0f}"
                distribution.append({"bin": bin_label, "count": int(counts[i])})

    correlation = []
    try:
        corr_matrix = df.corr(numeric_only=True)
        id_cols = [c for c in corr_matrix.columns if c.lower() in ('id', 'uuid') or c.lower().endswith('_id')]
        corr_matrix = corr_matrix.drop(index=id_cols, columns=id_cols, errors='ignore')
        
        for col_y in corr_matrix.index:
            for col_x in corr_matrix.columns:
                correlation.append({
                    "x": str(col_x),
                    "y": str(col_y),
                    "v": float(corr_matrix.loc[col_y, col_x])
                })
    except Exception:
        pass

    category_count = []
    cat_cols = cc.get("categorical", [])
    if cat_cols:
        cat_col = cat_cols[0]
        if target_col and target_col in cat_cols:
            cat_col = target_col
        counts = df[cat_col].value_counts()
        category_count = [{"name": str(k), "count": int(v)} for k, v in counts.items()]

    missing_values = []
    for col in df.columns:
        missing_count = int(df[col].isnull().sum())
        pct = float(round((missing_count / len(df)) * 100, 2)) if len(df) > 0 else 0.0
        missing_values.append({
            "column": col,
            "missing": missing_count,
            "percentage": pct
        })

    target_distribution = []
    if target_col and target_type == "categorical":
        counts = df[target_col].value_counts()
        target_distribution = [{"name": str(k), "count": int(v)} for k, v in counts.items()]

    target_histogram = []
    if target_col and target_type == "numeric":
        series = df[target_col].dropna()
        if not series.empty:
            counts, bins = np.histogram(series, bins=10)
            for i in range(len(counts)):
                bin_label = f"{bins[i]:.1f}-{bins[i+1]:.1f}"
                target_histogram.append({"bin": bin_label, "count": int(counts[i])})

    scatter_plot = []
    scatter_x_axis = ""
    if target_col and target_type == "numeric":
        num_features = [c for c in cc.get("numeric", []) if c != target_col]
        if num_features:
            top_feat = num_features[0]
            sampled_df = df[[top_feat, target_col]].dropna()
            if not sampled_df.empty:
                sampled_df = sampled_df.sample(min(100, len(sampled_df)), random_state=42)
                scatter_plot = [
                    {"x": float(row[top_feat]), "y": float(row[target_col])}
                    for _, row in sampled_df.iterrows()
                ]
                scatter_x_axis = top_feat

    box_plot_data = []
    box_plot_group_col = ""
    if target_col and target_type == "numeric":
        cat_cols = cc.get("categorical", [])
        if cat_cols:
            cat_col = cat_cols[0]
            box_plot_group_col = cat_col
            for cat_val in df[cat_col].dropna().unique():
                sub_series = df[df[cat_col] == cat_val][target_col].dropna()
                if len(sub_series) >= 4:
                    box_plot_data.append({
                        "group": str(cat_val),
                        "min": float(sub_series.min()),
                        "q25": float(sub_series.quantile(0.25)),
                        "q50": float(sub_series.quantile(0.50)),
                        "q75": float(sub_series.quantile(0.75)),
                        "max": float(sub_series.max())
                    })

    return {
        "target_column": target_col,
        "target_type": target_type,
        "topByTarget": top_by_target,
        "distribution": distribution,
        "correlation": correlation,
        "categoryCount": category_count,
        "missingValues": missing_values,
        "targetDistribution": target_distribution,
        "targetHistogram": target_histogram,
        "scatterPlot": scatter_plot,
        "scatterXAxis": scatter_x_axis,
        "boxPlot": box_plot_data,
        "boxPlotGroupCol": box_plot_group_col,
        "overviewStats": {
            "numeric": len(cc.get("numeric", [])),
            "categorical": len(cc.get("categorical", [])),
            "text": len(cc.get("text", []))
        }
    }


def generate_chart_insights(job_id: str) -> Dict[str, Any]:
    """
    Generate AI-powered insights for each active visualization tab.
    Builds compact data summaries per chart and calls the LLM once
    with a combined prompt to avoid multiple slow round-trips.
    Returns a dict: { tab_id: [insight strings] }
    """
    import json
    from app.services.ai_service import AIProviderManager, _parse_ai_json

    # Reuse the existing visualization data computation
    viz = get_visualizations(job_id)
    target_col = viz.get("target_column")
    target_type = viz.get("target_type")

    # Build compact per-chart summaries to feed the LLM
    chart_summaries: Dict[str, str] = {}

    # --- Missing Values ---
    mv = [d for d in viz.get("missingValues", []) if d.get("percentage", 0) > 0]
    if mv:
        top_mv = sorted(mv, key=lambda x: x["percentage"], reverse=True)[:8]
        mv_lines = ", ".join(f'{d["column"]} ({d["percentage"]}%)' for d in top_mv)
        chart_summaries["missing"] = (
            f"Columns with missing data: {mv_lines}. "
            f"Total columns with nulls: {len(mv)}."
        )

    # --- Numeric Distribution ---
    dist = viz.get("distribution", [])
    if dist:
        col_name = "a numeric column"
        df = __import__('app.core.session_store', fromlist=['store']).store.get_df(job_id)
        if df is not None:
            import numpy as np
            num_cols = df.select_dtypes(include='number').columns
            if len(num_cols) > 0:
                dist_col = "age" if "age" in num_cols else num_cols[0]
                if target_col and dist_col == target_col and len(num_cols) > 1:
                    dist_col = [c for c in num_cols if c != target_col][0]
                col_name = dist_col
                series = df[dist_col].dropna()
                chart_summaries["distribution"] = (
                    f"Distribution of '{dist_col}': mean={series.mean():.2f}, "
                    f"std={series.std():.2f}, min={series.min():.2f}, max={series.max():.2f}, "
                    f"skewness={series.skew():.2f}. Histogram bins: {[d['bin'] for d in dist[:5]]}."
                )

    # --- Correlation Heatmap ---
    corr = viz.get("correlation", [])
    if corr:
        # Find strongest correlations (excluding self-correlations)
        pairs = [(d["x"], d["y"], d["v"]) for d in corr if d["x"] != d["y"]]
        pairs_sorted = sorted(pairs, key=lambda x: abs(x[2]), reverse=True)[:6]
        corr_lines = "; ".join(f'{p[0]} vs {p[1]}: {p[2]:.2f}' for p in pairs_sorted)
        chart_summaries["correlation"] = (
            f"Top feature correlations: {corr_lines}."
        )

    # --- Category Distribution ---
    cat_count = viz.get("categoryCount", [])
    if cat_count:
        total = sum(d["count"] for d in cat_count)
        top_cats = cat_count[:6]
        cat_lines = ", ".join(
            f'{d["name"]} ({d["count"]} = {100*d["count"]//total if total else 0}%)'
            for d in top_cats
        )
        chart_summaries["category"] = (
            f"Category distribution: {cat_lines}. Total unique values shown: {len(cat_count)}."
        )

    # --- Target Distribution (categorical target) ---
    target_dist = viz.get("targetDistribution", [])
    if target_dist and target_col:
        total = sum(d["count"] for d in target_dist)
        td_lines = ", ".join(
            f'"{d["name"]}" ({d["count"]} = {100*d["count"]//total if total else 0}%)'
            for d in target_dist
        )
        chart_summaries["target_dist"] = (
            f"Target column '{target_col}' class distribution: {td_lines}. "
            f"Total samples: {total}. Classes: {len(target_dist)}."
        )

    # --- Feature vs Target (top_by_target) ---
    top_by = viz.get("topByTarget", [])
    if top_by and target_col:
        feat_lines = ", ".join(f'{d["name"]} ({d["value"]:.3f})' for d in top_by[:8])
        chart_summaries["top_by_target"] = (
            f"Feature correlation/importance relative to target '{target_col}': {feat_lines}."
        )

    # --- Target Histogram (numeric target) ---
    target_hist = viz.get("targetHistogram", [])
    if target_hist and target_col:
        bins_str = ", ".join(f'{d["bin"]}={d["count"]}' for d in target_hist)
        chart_summaries["target_hist"] = (
            f"Numeric target '{target_col}' histogram bins: {bins_str}."
        )

    # --- Scatter Plot ---
    scatter = viz.get("scatterPlot", [])
    scatter_x = viz.get("scatterXAxis", "")
    if scatter and scatter_x and target_col:
        xs = [d["x"] for d in scatter]
        ys = [d["y"] for d in scatter]
        import math
        n = len(xs)
        if n > 1:
            mean_x = sum(xs) / n
            mean_y = sum(ys) / n
            cov = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n)) / n
            std_x = math.sqrt(sum((x - mean_x) ** 2 for x in xs) / n) or 1
            std_y = math.sqrt(sum((y - mean_y) ** 2 for y in ys) / n) or 1
            pearson = round(cov / (std_x * std_y), 3)
        else:
            pearson = 0
        chart_summaries["scatter"] = (
            f"Scatter plot of '{scatter_x}' vs '{target_col}'. "
            f"Sample size: {n} points. Pearson correlation: {pearson}. "
            f"{scatter_x} range: [{min(xs):.2f}, {max(xs):.2f}]. "
            f"{target_col} range: [{min(ys):.2f}, {max(ys):.2f}]."
        )

    # --- Box Plot ---
    box = viz.get("boxPlot", [])
    box_grp = viz.get("boxPlotGroupCol", "")
    if box and box_grp and target_col:
        box_lines = "; ".join(
            f'{d["group"]}: Q25={d["q25"]:.1f}, median={d["q50"]:.1f}, Q75={d["q75"]:.1f}'
            for d in box[:6]
        )
        chart_summaries["box_plot"] = (
            f"Box plots of '{target_col}' grouped by '{box_grp}': {box_lines}."
        )

    if not chart_summaries:
        return {}

    # Build the combined prompt — one LLM call for all charts
    summaries_block = "\n".join(
        f'- Chart "{k}": {v}' for k, v in chart_summaries.items()
    )

    prompt = (
        "You are a Senior Data Scientist. For each chart listed below, "
        "generate 3–5 concise, specific, data-grounded bullet point insights. "
        "Each insight must be factual and reference real numbers from the summary. "
        "Cover: trends, outliers, distributions, class imbalance, correlations, "
        "and business meaning where relevant.\n\n"
        "Return ONLY a raw JSON object (no markdown fences). "
        "Keys are the chart names exactly as listed below. "
        "Values are arrays of insight strings (plain text, no markdown bullets).\n\n"
        "Charts to analyse:\n"
        f"{summaries_block}"
    )

    try:
        ai_mgr = AIProviderManager()
        raw = ai_mgr.generate_response(prompt)
        parsed = _parse_ai_json(raw)
        # Ensure we return only the keys we asked for and that values are lists
        result = {}
        for k in chart_summaries:
            val = parsed.get(k, [])
            result[k] = val if isinstance(val, list) else [str(val)]
        return result
    except Exception as e:
        # Return empty insights rather than crashing — UI will handle gracefully
        return {k: [] for k in chart_summaries}

