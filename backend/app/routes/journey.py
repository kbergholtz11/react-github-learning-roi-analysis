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
from app.skill_service import (
    get_skill_journey_summary,
    get_top_skill_learners,
    get_skill_profile_by_handle,
)

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
        # NOTE: Kusto integration was removed as it wasn't being used.
        # Journey data comes from enriched Parquet data via csv_service.
        # For live Kusto queries, see /api/query endpoint.
        
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


# =============================================================================
# Skill-Based Journey Endpoints (New Model)
# =============================================================================


@router.get("/skills")
async def get_skill_journey():
    """
    Get skill-based journey analytics.
    
    This is the new skill-focused model that considers:
    - Learning engagement (25% weight)
    - Product usage (35% weight) - Primary focus
    - Certification (15% weight) - Important but not dominant
    - Consistency (15% weight)
    - Growth trajectory (10% weight)
    
    Returns:
    - Skill funnel with counts by level
    - Average skill scores
    - Dimension breakdowns
    - Growth metrics
    """
    try:
        summary = get_skill_journey_summary()
        return {
            "funnel": [
                {
                    "level": stage.level.value,
                    "count": stage.count,
                    "percentage": stage.percentage,
                    "avgScore": stage.avg_score,
                    "color": stage.color,
                    "description": stage.description,
                }
                for stage in summary.funnel
            ],
            "totalLearners": summary.total_learners,
            "avgSkillScore": summary.avg_skill_score,
            "skillDistribution": summary.skill_distribution,
            "dimensionAverages": summary.dimension_averages,
            "growthMetrics": summary.growth_metrics,
            "weights": {
                "Learning": 0.25,
                "Product Usage": 0.35,
                "Certification": 0.15,
                "Consistency": 0.15,
                "Growth": 0.10,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching skill journey: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills/top")
async def get_top_skilled_learners(
    limit: int = Query(10, ge=1, le=50, description="Number of top learners"),
):
    """
    Get top learners by skill score.
    
    Returns learners ranked by their overall skill score,
    with breakdown by dimension.
    """
    try:
        top_learners = get_top_skill_learners(limit)
        return {
            "learners": [
                {
                    "handle": p.user_handle,
                    "dotcomId": p.dotcom_id,
                    "skillScore": p.skill_score,
                    "skillLevel": p.skill_level.value,
                    "dimensions": {
                        d.dimension.value: {
                            "raw": round(d.raw_score, 1),
                            "weighted": round(d.weighted_score, 1),
                        }
                        for d in p.dimensions
                    },
                    "learningHours": p.learning_hours,
                    "productUsageHours": p.product_usage_hours,
                    "totalCerts": p.total_certs,
                    "isGrowing": p.is_growing,
                }
                for p in top_learners
            ],
            "total": len(top_learners),
        }
    except Exception as e:
        logger.error(f"Error fetching top skilled learners: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skills/profile/{handle}")
async def get_learner_skill_profile(handle: str):
    """
    Get detailed skill profile for a specific learner.
    
    Shows complete breakdown of skill score calculation
    with all contributing factors.
    """
    try:
        profile = get_skill_profile_by_handle(handle)
        
        if not profile:
            raise HTTPException(status_code=404, detail=f"Learner {handle} not found")
        
        return {
            "handle": profile.user_handle,
            "dotcomId": profile.dotcom_id,
            "skillScore": profile.skill_score,
            "skillLevel": profile.skill_level.value,
            "dimensions": [
                {
                    "dimension": d.dimension.value,
                    "rawScore": round(d.raw_score, 1),
                    "weightedScore": round(d.weighted_score, 1),
                    "weight": d.weight,
                    "details": d.details,
                }
                for d in profile.dimensions
            ],
            "metrics": {
                "learningHours": profile.learning_hours,
                "learningDays": profile.learning_days,
                "productUsageHours": profile.product_usage_hours,
                "copilotDays": profile.copilot_days,
                "actionsEvents": profile.actions_events,
                "securityEvents": profile.security_events,
                "totalCerts": profile.total_certs,
                "daysSinceLastActivity": profile.days_since_last_activity,
            },
            "growth": {
                "isGrowing": profile.is_growing,
                "growthRate": profile.growth_rate,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching skill profile for {handle}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
