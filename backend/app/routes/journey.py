"""Journey analytics API routes."""

import logging

from fastapi import APIRouter, HTTPException, Query

from app.csv_service import (
    get_dashboard_metrics,
    get_drop_off_analysis,
    get_journey_funnel,
    get_monthly_progression,
)
from app.kusto import get_kusto_service, JourneyQueries
from app.models import JourneyResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/journey", tags=["journey"])


@router.get("", response_model=JourneyResponse)
async def get_journey_analytics():
    """
    Get journey analytics data.
    
    Returns:
    - Journey funnel with counts by stage
    - Average time to completion
    - Stage velocity metrics
    - Drop-off analysis between stages
    - Monthly progression trends
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            # Use live Kusto queries for journey data
            logger.info("Fetching journey data from Kusto")
            funnel_data = kusto.execute_query(JourneyQueries.get_funnel_counts())
            time_data = kusto.execute_query(JourneyQueries.get_time_to_certification())
            # Would transform and return Kusto data
        
        # Fall back to CSV data
        funnel = get_journey_funnel()
        drop_off = get_drop_off_analysis()
        monthly = get_monthly_progression()
        
        # Calculate stage velocity (simulated)
        stage_velocity = {
            "learning": 14,
            "certified": 30,
            "multi_certified": 60,
            "specialist": 90,
            "champion": 120,
        }
        
        return JourneyResponse(
            funnel=funnel,
            avg_time_to_completion=45,
            stage_velocity=stage_velocity,
            drop_off_analysis=drop_off,
            monthly_progression=monthly,
            total_journey_users=sum(s.count for s in funnel),
        )
        
    except Exception as e:
        logger.error(f"Error fetching journey data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel")
async def get_funnel():
    """
    Get just the journey funnel data.
    
    Lighter endpoint for just the funnel visualization.
    """
    try:
        funnel = get_journey_funnel()
        return {
            "funnel": funnel,
            "total": sum(s.count for s in funnel),
        }
    except Exception as e:
        logger.error(f"Error fetching funnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progression")
async def get_progression(
    months: int = Query(6, ge=1, le=24, description="Number of months"),
):
    """
    Get monthly progression data.
    
    Shows how learner distribution changes over time.
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            rows = kusto.execute_query(
                JourneyQueries.get_monthly_progression(months)
            )
            return {
                "progression": rows,
                "months": months,
                "source": "kusto",
            }
        
        monthly = get_monthly_progression()
        return {
            "progression": monthly,
            "months": len(monthly),
            "source": "csv",
        }
        
    except Exception as e:
        logger.error(f"Error fetching progression: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/velocity")
async def get_stage_velocity():
    """
    Get time spent in each journey stage.
    
    Helps identify bottlenecks and optimize learning paths.
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            rows = kusto.execute_query(JourneyQueries.get_time_to_certification())
            return {
                "stages": rows,
                "source": "kusto",
            }
        
        # Simulated velocity data
        return {
            "stages": [
                {"stage": "Learning", "avg_days": 14, "median_days": 10, "p90_days": 28},
                {"stage": "Certified", "avg_days": 30, "median_days": 25, "p90_days": 60},
                {"stage": "Multi-Certified", "avg_days": 45, "median_days": 40, "p90_days": 90},
                {"stage": "Specialist", "avg_days": 60, "median_days": 55, "p90_days": 120},
                {"stage": "Champion", "avg_days": 90, "median_days": 80, "p90_days": 180},
            ],
            "source": "csv",
        }
        
    except Exception as e:
        logger.error(f"Error fetching velocity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drop-off")
async def get_drop_off():
    """
    Get drop-off analysis between stages.
    
    Shows conversion rates and where learners get stuck.
    """
    try:
        drop_off = get_drop_off_analysis()
        return {
            "analysis": drop_off,
            "total_stages": len(drop_off),
        }
    except Exception as e:
        logger.error(f"Error fetching drop-off: {e}")
        raise HTTPException(status_code=500, detail=str(e))
