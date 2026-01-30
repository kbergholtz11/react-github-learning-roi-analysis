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
    active_users: int = 0
    total_suggestions: int = 0
    total_completions: int = 0
    avg_acceptance_rate: float = 0.0


class LanguageUsage(BaseModel):
    """Copilot usage by programming language."""
    language: str
    users: int
    suggestions: int
    completions: int
    avg_acceptance: float


class DailyTrend(BaseModel):
    """Daily Copilot usage trend."""
    date: str
    active_users: int
    completions: int
    acceptance_rate: float


class LearnerImpact(BaseModel):
    """Copilot impact by learner status."""
    learner_status: str
    users: int
    avg_completions: float
    avg_acceptance: float


class CopilotAnalyticsResponse(BaseModel):
    """Complete Copilot analytics response."""
    stats: CopilotStats
    by_language: List[LanguageUsage]
    trend: List[DailyTrend]
    by_learner_status: List[LearnerImpact]


@router.get("/stats", response_model=CopilotStats)
async def get_copilot_stats():
    """Get Copilot adoption statistics."""
    kusto = get_kusto_service()
    
    if not kusto.is_available:
        # Return sample data if Kusto not available
        return CopilotStats(
            total_users=1250,
            active_users=890,
            total_suggestions=125000,
            total_completions=98500,
            avg_acceptance_rate=78.8,
        )
    
    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_adoption_stats())
        if rows:
            row = rows[0]
            return CopilotStats(
                total_users=row.get("total_users", 0),
                active_users=row.get("active_users", 0),
                total_suggestions=row.get("total_suggestions", 0),
                total_completions=row.get("total_completions", 0),
                avg_acceptance_rate=row.get("avg_acceptance_rate", 0.0),
            )
    except Exception as e:
        logger.warning(f"Kusto query failed, using sample data: {e}")
    
    return CopilotStats(
        total_users=1250,
        active_users=890,
        total_suggestions=125000,
        total_completions=98500,
        avg_acceptance_rate=78.8,
    )


@router.get("/by-language", response_model=List[LanguageUsage])
async def get_copilot_by_language():
    """Get Copilot usage by programming language."""
    kusto = get_kusto_service()
    
    sample_data = [
        LanguageUsage(language="Python", users=450, suggestions=35000, completions=28000, avg_acceptance=80.0),
        LanguageUsage(language="JavaScript", users=380, suggestions=28000, completions=22000, avg_acceptance=78.5),
        LanguageUsage(language="TypeScript", users=320, suggestions=25000, completions=20000, avg_acceptance=80.0),
        LanguageUsage(language="Java", users=210, suggestions=18000, completions=14000, avg_acceptance=77.8),
        LanguageUsage(language="Go", users=150, suggestions=12000, completions=9500, avg_acceptance=79.2),
        LanguageUsage(language="C#", users=120, suggestions=9000, completions=7000, avg_acceptance=77.8),
        LanguageUsage(language="Ruby", users=80, suggestions=5000, completions=3800, avg_acceptance=76.0),
        LanguageUsage(language="Rust", users=60, suggestions=4000, completions=3200, avg_acceptance=80.0),
    ]
    
    if not kusto.is_available:
        return sample_data
    
    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_usage_by_language())
        if rows:
            return [
                LanguageUsage(
                    language=row.get("language", "Unknown"),
                    users=row.get("users", 0),
                    suggestions=row.get("suggestions", 0),
                    completions=row.get("completions", 0),
                    avg_acceptance=row.get("avg_acceptance", 0.0),
                )
                for row in rows
            ]
    except Exception as e:
        logger.warning(f"Kusto query failed, using sample data: {e}")
    
    return sample_data


@router.get("/trend", response_model=List[DailyTrend])
async def get_copilot_trend(days: int = 30):
    """Get Copilot usage trend over time."""
    kusto = get_kusto_service()
    
    # Generate sample trend data
    from datetime import datetime, timedelta
    sample_data = []
    for i in range(days):
        date = (datetime.now() - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        base = 800 + i * 3
        sample_data.append(
            DailyTrend(
                date=date,
                active_users=base + (i % 5) * 10,
                completions=base * 100 + (i % 3) * 500,
                acceptance_rate=75 + (i % 10) * 0.5,
            )
        )
    
    if not kusto.is_available:
        return sample_data
    
    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_trend(days))
        if rows:
            return [
                DailyTrend(
                    date=str(row.get("timestamp", ""))[:10],
                    active_users=row.get("active_users", 0),
                    completions=row.get("completions", 0),
                    acceptance_rate=row.get("acceptance_rate", 0.0),
                )
                for row in rows
            ]
    except Exception as e:
        logger.warning(f"Kusto query failed, using sample data: {e}")
    
    return sample_data


@router.get("/by-learner-status", response_model=List[LearnerImpact])
async def get_copilot_by_learner_status():
    """Get Copilot impact correlated with learning status."""
    kusto = get_kusto_service()
    
    sample_data = [
        LearnerImpact(learner_status="Champion", users=45, avg_completions=1250, avg_acceptance=85.2),
        LearnerImpact(learner_status="Specialist", users=120, avg_completions=980, avg_acceptance=82.5),
        LearnerImpact(learner_status="Multi-Certified", users=280, avg_completions=750, avg_acceptance=80.1),
        LearnerImpact(learner_status="Certified", users=450, avg_completions=520, avg_acceptance=78.0),
        LearnerImpact(learner_status="Learning", users=620, avg_completions=380, avg_acceptance=75.5),
        LearnerImpact(learner_status="Prospect", users=890, avg_completions=250, avg_acceptance=72.0),
    ]
    
    if not kusto.is_available:
        return sample_data
    
    try:
        rows = kusto.execute_on_gh_copilot(CopilotQueries.get_copilot_impact_by_learner_status())
        if rows:
            return [
                LearnerImpact(
                    learner_status=row.get("learner_status", "Unknown"),
                    users=row.get("users", 0),
                    avg_completions=row.get("avg_completions", 0.0),
                    avg_acceptance=row.get("avg_acceptance", 0.0),
                )
                for row in rows
            ]
    except Exception as e:
        logger.warning(f"Kusto query failed, using sample data: {e}")
    
    return sample_data


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
