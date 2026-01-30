"""Metrics API routes."""

import logging

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.csv_service import (
    get_dashboard_metrics,
    get_journey_funnel,
    get_status_breakdown,
)
from app.kusto import get_kusto_service, LearnerQueries
from app.models import MetricsResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("", response_model=MetricsResponse)
async def get_metrics():
    """
    Get dashboard metrics.
    
    Returns aggregated metrics including:
    - Total learners, certified users, learning users
    - Average usage increase, products adopted, learning hours
    - Impact score and retention rate
    - Status breakdown and journey funnel
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            # Try to use live Kusto queries
            try:
                logger.info("Fetching metrics from Kusto")
                stats = kusto.execute_query(LearnerQueries.get_certification_stats())
                
                if stats:
                    row = stats[0]
                    # Build metrics from Kusto response
                    # This would need to be adapted to actual Kusto schema
                    pass
            except Exception as kusto_err:
                logger.warning(f"Kusto query failed, falling back to CSV: {kusto_err}")
        
        # Fall back to CSV data (or if Kusto not available)
        metrics = get_dashboard_metrics()
        status_breakdown = get_status_breakdown()
        funnel = get_journey_funnel()
        
        return MetricsResponse(
            metrics=metrics,
            status_breakdown=status_breakdown,
            funnel=funnel,
        )
        
    except Exception as e:
        logger.error(f"Error fetching metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime")
async def get_realtime_metrics():
    """
    Get real-time metrics directly from Kusto.
    
    This endpoint always queries Kusto for the latest data,
    bypassing the cache. Use sparingly.
    """
    kusto = get_kusto_service()
    
    if not kusto.is_available:
        raise HTTPException(
            status_code=503,
            detail="Kusto is not configured. Set KUSTO_CLUSTER_URL and KUSTO_DATABASE."
        )
    
    try:
        stats = kusto.execute_query(
            LearnerQueries.get_certification_stats(),
            use_cache=False,
        )
        
        funnel = kusto.execute_query(
            LearnerQueries.get_learners_by_status(),
            use_cache=False,
        )
        
        return {
            "stats": stats[0] if stats else {},
            "funnel": funnel,
            "source": "kusto_realtime",
        }
        
    except Exception as e:
        logger.error(f"Kusto query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync-status")
async def get_sync_status():
    """
    Get the status of all data sources.
    
    Returns when each data source was last synced and its status.
    """
    import json
    from pathlib import Path
    
    settings = get_settings()
    sync_file = Path(settings.data_dir) / "sync_status.json"
    
    if not sync_file.exists():
        return {
            "status": "unknown",
            "message": "No sync status available. Run sync-all-data.py to populate.",
            "sources": {}
        }
    
    with open(sync_file) as f:
        sources = json.load(f)
    
    # Add file row counts
    data_dir = Path(settings.data_dir)
    for source_name in sources:
        csv_file = data_dir / f"{source_name}.csv"
        if csv_file.exists():
            with open(csv_file) as f:
                sources[source_name]["file_rows"] = sum(1 for _ in f) - 1  # Subtract header
    
    return {
        "status": "ok",
        "sources": sources
    }


@router.post("/cache/clear")
async def clear_metrics_cache():
    """Clear the metrics cache."""
    from app.csv_service import clear_cache
    
    kusto = get_kusto_service()
    kusto.clear_cache()
    clear_cache()
    
    return {"status": "ok", "message": "Cache cleared"}
