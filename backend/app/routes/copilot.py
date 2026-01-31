"""Copilot analytics API routes."""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.kusto import get_kusto_service, CopilotQueries

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/copilot", tags=["copilot"])


class CopilotStats(BaseModel):
    """Copilot adoption statistics."""
    total_users: int = 0
    active_30d: int = 0
    active_7d: int = 0
    total_events: int = 0
    total_days_tracked: int = 0


class LanguageUsage(BaseModel):
    """Copilot usage by programming language."""
    language: str
    users: int
    events: int
    active_days: int = 0


class DailyTrend(BaseModel):
    """Daily Copilot usage trend."""
    date: str
    active_users: int
    total_events: int = 0


class LearnerImpact(BaseModel):
    """Copilot impact by learner status."""
    learner_status: str
    users: int
    avg_events: float = 0.0
    avg_active_days: float = 0.0


class CopilotAnalyticsResponse(BaseModel):
    """Complete Copilot analytics response."""
    stats: CopilotStats
    by_language: List[LanguageUsage]
    trend: List[DailyTrend]
    by_learner_status: List[LearnerImpact]


@router.get("/stats", response_model=CopilotStats)
async def get_copilot_stats():
    """Get Copilot adoption statistics from copilot_unified_engagement."""
    kusto = get_kusto_service()

    if not kusto.is_available:
        return CopilotStats()

    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_adoption_stats())
        if rows:
            row = rows[0]
            return CopilotStats(
                total_users=row.get("total_users", 0),
                active_30d=row.get("active_30d", 0),
                active_7d=row.get("active_7d", 0),
                total_events=row.get("total_events", 0),
                total_days_tracked=row.get("total_days_tracked", 0),
            )
    except Exception as e:
        logger.warning(f"Kusto query failed: {e}")

    return CopilotStats()


@router.get("/by-language", response_model=List[LanguageUsage])
async def get_copilot_by_language():
    """Get Copilot usage by programming language from copilot_unified_engagement."""
    kusto = get_kusto_service()

    if not kusto.is_available:
        return []

    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_usage_by_language())
        if rows:
            return [
                LanguageUsage(
                    language=row.get("language_id", "Unknown"),
                    users=row.get("users", 0),
                    events=row.get("events", 0),
                    active_days=row.get("active_days", 0),
                )
                for row in rows
            ]
    except Exception as e:
        logger.warning(f"Kusto query failed: {e}")

    return []


@router.get("/trend", response_model=List[DailyTrend])
async def get_copilot_trend(days: int = 30):
    """Get Copilot usage trend over time from copilot_unified_engagement."""
    kusto = get_kusto_service()

    if not kusto.is_available:
        return []

    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_trend(days))
        if rows:
            return [
                DailyTrend(
                    date=str(row.get("day", ""))[:10],
                    active_users=row.get("active_users", 0),
                    total_events=row.get("total_events", 0),
                )
                for row in rows
            ]
    except Exception as e:
        logger.warning(f"Kusto query failed: {e}")

    return []


@router.get("/by-learner-status", response_model=List[LearnerImpact])
async def get_copilot_by_learner_status():
    """Get Copilot impact correlated with learning status."""
    kusto = get_kusto_service()
    
    if not kusto.is_available:
        return []

    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_impact_by_learner_status())
        if rows:
            return [
                LearnerImpact(
                    learner_status=row.get("learner_status", "Unknown"),
                    users=row.get("users", 0),
                    avg_events=row.get("avg_events", 0.0),
                    avg_active_days=row.get("avg_active_days", 0.0),
                )
                for row in rows
            ]
    except Exception as e:
        logger.warning(f"Kusto query failed: {e}")

    return []


@router.get("", response_model=CopilotAnalyticsResponse)
async def get_copilot_analytics():
    """Get complete Copilot analytics."""
    stats = await get_copilot_stats()
    by_language = await get_copilot_by_language()
    trend = await get_copilot_trend()
    by_learner_status = await get_copilot_by_learner_status()
    
    return CopilotAnalyticsResponse(
        stats=stats,
        by_language=by_language,
        trend=trend,
        by_learner_status=by_learner_status,
    )
