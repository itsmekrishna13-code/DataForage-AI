from fastapi import APIRouter, HTTPException
from app.services.eda_service import perform_eda, get_visualizations, generate_chart_insights
from typing import Dict, Any

router = APIRouter()

@router.get("/insights/{job_id}", response_model=Dict[str, Any])
def get_chart_insights_endpoint(job_id: str):
    """
    Generate AI-powered insights for each active visualization tab.
    Returns a map of tab_id → list of insight strings.
    Always returns 200 — if AI fails, returns empty lists per tab.
    """
    try:
        insights = generate_chart_insights(job_id)
        return {"insights": insights}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Return empty rather than crashing the UI
        return {"insights": {}}

@router.get("/visualizations/{job_id}", response_model=Dict[str, Any])
def get_visualizations_endpoint(job_id: str):
    try:
        return get_visualizations(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting visualizations: {str(e)}")

@router.get("/{job_id}", response_model=Dict[str, Any])
def get_eda(job_id: str):
    try:
        eda_results = perform_eda(job_id)
        return eda_results
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing EDA: {str(e)}")

