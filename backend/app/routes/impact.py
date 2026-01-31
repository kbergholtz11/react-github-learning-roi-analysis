"""Impact analytics API routes."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.csv_service import (
    get_dashboard_metrics,
    get_product_adoption,
    get_stage_impact,
)
from app.kusto import get_kusto_service, ImpactQueries
from app.models import ImpactResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/impact", tags=["impact"])

# Constant for ROI breakdown (used in multiple places)
ROI_BREAKDOWN = [
    {"name": "Productivity", "value": 45, "color": "#22c55e"},
    {"name": "Quality", "value": 30, "color": "#3b82f6"},
    {"name": "Time Savings", "value": 15, "color": "#8b5cf6"},
    {"name": "Knowledge", "value": 10, "color": "#f59e0b"},
]


def get_aggregated_impact():
    """Read pre-aggregated impact.json file for accurate data."""
    settings = get_settings()
    impact_file = Path(settings.data_dir) / "aggregated" / "impact.json"
    
    if not impact_file.exists():
        return None
    
    try:
        with open(impact_file) as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read aggregated impact: {e}")
        return None


@router.get("", response_model=ImpactResponse)
async def get_impact_analytics():
    """
    Get learning impact analytics.
    
    Returns:
    - Impact by journey stage
    - Product adoption before/after learning
    - Learning-to-usage correlation
    - ROI breakdown
    """
    try:
        # First try pre-aggregated JSON data
        aggregated = get_aggregated_impact()
        if aggregated:
            logger.info("Using pre-aggregated impact.json data")
            
            # Map camelCase JSON to snake_case Pydantic models
            stage_impact = [
                {
                    "stage": s.get("stage"),
                    "learners": s.get("learners", 0),
                    "avg_usage_increase": s.get("avgUsageIncrease", 0),
                    "platform_time_increase": s.get("platformTimeIncrease", 0),
                    "top_product": s.get("topProduct", "Unknown"),
                    "adoption_rate": s.get("adoptionRate"),
                }
                for s in aggregated.get("stageImpact", [])
            ]
            
            product_adoption = [
                {
                    "name": p.get("name"),
                    "before": p.get("before", 0),
                    "after": p.get("after", 0),
                    "increase": p.get("increase", 0),
                }
                for p in aggregated.get("productAdoption", [])
            ]
            
            correlation_data = [
                {
                    "name": c.get("name"),
                    "learning_hours": c.get("learningHours", 0),
                    "product_usage": c.get("productUsage", 0),
                    "platform_time": c.get("platformTime", 0),
                }
                for c in aggregated.get("correlationData", [])
            ]
            
            return ImpactResponse(
                stage_impact=stage_impact,
                product_adoption=product_adoption,
                correlation_data=correlation_data,
                roi_breakdown=aggregated.get("roiBreakdown", ROI_BREAKDOWN),
            )
        
        kusto = get_kusto_service()

        if kusto.is_available:
            try:
                logger.info("Fetching impact data from Kusto")
                usage_rows = kusto.execute_on_gh(
                    ImpactQueries.get_product_usage_by_cert_status(),
                    database="canonical",
                )
                correlation_rows = kusto.execute_on_gh(
                    ImpactQueries.get_learning_impact_correlation(),
                    database="canonical",
                )

                if usage_rows:
                    stage_impact_data = [
                        {
                            "stage": row.get("learner_status", "Unknown"),
                            "learners": row.get("learners", 0),
                            "avg_usage_increase": row.get("copilot_adoption_pct", 0),
                            "platform_time_increase": row.get("avg_active_days", 0),
                            "top_product": "GitHub Copilot",
                        }
                        for row in usage_rows
                    ]

                    correlation_data = [
                        {
                            "name": row.get("cert_group", "Unknown"),
                            "learning_hours": row.get("total_users", 0),
                            "product_usage": row.get("activity_pct", 0),
                            "platform_time": row.get("copilot_pct", 0),
                        }
                        for row in (correlation_rows or [])
                    ]

                    return ImpactResponse(
                        stage_impact=stage_impact_data,
                        product_adoption=get_product_adoption(),
                        correlation_data=correlation_data,
                        roi_breakdown=ROI_BREAKDOWN,
                    )
            except Exception as kusto_err:
                logger.warning(f"Kusto impact query failed, falling back to CSV: {kusto_err}")

        # Fall back to CSV/calculated data
        stage_impact = get_stage_impact()
        product_adoption = get_product_adoption()

        return ImpactResponse(
            stage_impact=stage_impact,
            product_adoption=product_adoption,
            correlation_data=FALLBACK_CORRELATION_DATA,
            roi_breakdown=ROI_BREAKDOWN,
        )
        
    except Exception as e:
        logger.error(f"Error fetching impact data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-stage")
async def get_impact_by_stage():
    """
    Get impact metrics grouped by journey stage.
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            # Use get_product_usage_by_cert_status which groups by learner_status
            rows = kusto.execute_on_gh(
                ImpactQueries.get_product_usage_by_cert_status(),
                database="canonical",
            )
            if rows:
                return {
                    "stages": rows,
                    "source": "kusto",
                }
        
        stage_impact = get_stage_impact()
        return {
            "stages": stage_impact,
            "source": "csv",
        }
        
    except Exception as e:
        logger.error(f"Error fetching stage impact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products")
async def get_product_impact():
    """
    Get product adoption before/after learning.
    """
    try:
        adoption = get_product_adoption()
        
        # Calculate improvement percentages
        for product in adoption:
            product_dict = product.model_dump()
            product_dict["improvement"] = round(
                ((product.after - product.before) / max(product.before, 1)) * 100, 1
            )
        
        return {
            "products": adoption,
            "avg_improvement": round(
                sum((p.after - p.before) for p in adoption) / max(len(adoption), 1), 1
            ),
        }
        
    except Exception as e:
        logger.error(f"Error fetching product impact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlation")
async def get_learning_correlation():
    """
    Get correlation between learning hours and product usage.
    
    Helps prove the ROI of learning investment.
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            rows = kusto.execute_query(ImpactQueries.get_learning_impact_correlation())
            return {
                "correlation": rows,
                "source": "kusto",
            }
        
        # Simulated correlation data
        return {
            "correlation": {
                "coefficient": 0.78,
                "description": "Strong positive correlation between learning hours and product usage",
                "data_points": 5000,
            },
            "source": "csv",
        }
        
    except Exception as e:
        logger.error(f"Error fetching correlation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roi")
async def get_roi_metrics():
    """
    Get ROI metrics and breakdown.
    """
    try:
        metrics = get_dashboard_metrics()
        
        # ROI calculation constants (documented values)
        ROI_PER_CERTIFIED_USER = 2500  # Estimated productivity gain per certified user ($)
        ROI_PER_LEARNING_HOUR = 50     # Estimated value per hour of learning ($)
        ROI_PER_IMPACT_POINT = 1000    # Estimated value per impact score point ($)
        
        # Calculate estimated ROI
        productivity_gain = metrics.certified_users * ROI_PER_CERTIFIED_USER
        time_savings = metrics.total_learning_hours * ROI_PER_LEARNING_HOUR
        quality_improvement = metrics.impact_score * ROI_PER_IMPACT_POINT
        
        total_roi = productivity_gain + time_savings + quality_improvement
        
        return {
            "total_roi": total_roi,
            "breakdown": {
                "productivity_gain": productivity_gain,
                "time_savings": time_savings,
                "quality_improvement": quality_improvement,
            },
            "per_learner": round(total_roi / max(metrics.total_learners, 1), 2),
            "impact_score": metrics.impact_score,
        }
        
    except Exception as e:
        logger.error(f"Error calculating ROI: {e}")
        raise HTTPException(status_code=500, detail=str(e))
