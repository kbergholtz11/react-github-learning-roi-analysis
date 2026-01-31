"""Copilot analytics API routes.

Provides Copilot usage insights for enrolled learners from enriched data.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_database, CopilotInsightQueries

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/copilot", tags=["copilot"])


class CopilotStats(BaseModel):
    """Copilot adoption statistics for enrolled learners."""
    total_learners: int = 0
    copilot_users: int = 0
    adoption_rate: float = 0.0
    total_events: int = 0
    total_contributions: int = 0
    total_copilot_days: int = 0
    avg_days_per_user: float = 0.0
    avg_events_per_user: float = 0.0


class LearnerStatusUsage(BaseModel):
    """Copilot usage by learner certification status."""
    learner_status: str
    total_learners: int
    copilot_users: int
    adoption_rate: float
    total_events: int = 0
    avg_events: float = 0.0
    avg_days: float = 0.0


class RegionUsage(BaseModel):
    """Copilot usage by region."""
    region: str
    total_learners: int
    copilot_users: int
    adoption_rate: float
    total_events: int = 0
    avg_events: float = 0.0


class TopUser(BaseModel):
    """Top Copilot user."""
    userhandle: Optional[str] = None
    email: str
    company_name: Optional[str] = None
    learner_status: Optional[str] = None
    copilot_days: int = 0
    copilot_engagement_events: int = 0
    copilot_contribution_events: int = 0
    exams_passed: int = 0


class CertificationComparison(BaseModel):
    """Copilot adoption comparison by certification status."""
    cert_status: str
    total_learners: int
    copilot_users: int
    adoption_rate: float
    avg_events: float = 0.0
    avg_days: float = 0.0


class CopilotAnalyticsResponse(BaseModel):
    """Complete Copilot analytics response for enrolled learners."""
    stats: CopilotStats
    by_learner_status: List[LearnerStatusUsage]
    by_region: List[RegionUsage]
    cert_comparison: List[CertificationComparison]
    source: str = "enriched"


@router.get("/stats", response_model=CopilotStats)
async def get_copilot_stats():
    """Get Copilot adoption statistics for all enrolled learners."""
    db = get_database()
    
    if not db.is_available:
        return CopilotStats()

    try:
        stats = CopilotInsightQueries.get_copilot_stats()
        return CopilotStats(
            total_learners=int(stats.get("total_learners", 0)),
            copilot_users=int(stats.get("copilot_users", 0)),
            adoption_rate=float(stats.get("adoption_rate", 0)),
            total_events=int(stats.get("total_events", 0) or 0),
            total_contributions=int(stats.get("total_contributions", 0) or 0),
            total_copilot_days=int(stats.get("total_copilot_days", 0) or 0),
            avg_days_per_user=float(stats.get("avg_days_per_user", 0) or 0),
            avg_events_per_user=float(stats.get("avg_events_per_user", 0) or 0),
        )
    except Exception as e:
        logger.warning(f"Query failed: {e}")
        return CopilotStats()


@router.get("/by-learner-status", response_model=List[LearnerStatusUsage])
async def get_copilot_by_learner_status():
    """Get Copilot usage broken down by learner certification status."""
    db = get_database()

    if not db.is_available:
        return []

    try:
        rows = CopilotInsightQueries.get_copilot_by_learner_status()
        return [
            LearnerStatusUsage(
                learner_status=row.get("learner_status", "Unknown"),
                total_learners=int(row.get("total_learners", 0)),
                copilot_users=int(row.get("copilot_users", 0)),
                adoption_rate=float(row.get("adoption_rate", 0)),
                total_events=int(row.get("total_events", 0) or 0),
                avg_events=float(row.get("avg_events", 0) or 0),
                avg_days=float(row.get("avg_days", 0) or 0),
            )
            for row in rows
        ]
    except Exception as e:
        logger.warning(f"Query failed: {e}")
        return []


@router.get("/by-region", response_model=List[RegionUsage])
async def get_copilot_by_region():
    """Get Copilot usage broken down by region."""
    db = get_database()

    if not db.is_available:
        return []

    try:
        rows = CopilotInsightQueries.get_copilot_by_region()
        return [
            RegionUsage(
                region=row.get("region", "Unknown"),
                total_learners=int(row.get("total_learners", 0)),
                copilot_users=int(row.get("copilot_users", 0)),
                adoption_rate=float(row.get("adoption_rate", 0)),
                total_events=int(row.get("total_events", 0) or 0),
                avg_events=float(row.get("avg_events", 0) or 0),
            )
            for row in rows
        ]
    except Exception as e:
        logger.warning(f"Query failed: {e}")
        return []


@router.get("/top-users", response_model=List[TopUser])
async def get_copilot_top_users(limit: int = 20):
    """Get top Copilot users by engagement."""
    db = get_database()

    if not db.is_available:
        return []

    try:
        rows = CopilotInsightQueries.get_copilot_top_users(limit)
        return [
            TopUser(
                userhandle=row.get("userhandle"),
                email=row.get("email", ""),
                company_name=row.get("company_name"),
                learner_status=row.get("learner_status"),
                copilot_days=int(row.get("copilot_days", 0) or 0),
                copilot_engagement_events=int(row.get("copilot_engagement_events", 0) or 0),
                copilot_contribution_events=int(row.get("copilot_contribution_events", 0) or 0),
                exams_passed=int(row.get("exams_passed", 0) or 0),
            )
            for row in rows
        ]
    except Exception as e:
        logger.warning(f"Query failed: {e}")
        return []


@router.get("/cert-comparison", response_model=List[CertificationComparison])
async def get_copilot_cert_comparison():
    """Compare Copilot adoption between certified and non-certified learners."""
    db = get_database()

    if not db.is_available:
        return []

    try:
        rows = CopilotInsightQueries.get_copilot_vs_certification()
        return [
            CertificationComparison(
                cert_status=row.get("cert_status", "Unknown"),
                total_learners=int(row.get("total_learners", 0)),
                copilot_users=int(row.get("copilot_users", 0)),
                adoption_rate=float(row.get("adoption_rate", 0)),
                avg_events=float(row.get("avg_events", 0) or 0),
                avg_days=float(row.get("avg_days", 0) or 0),
            )
            for row in rows
        ]
    except Exception as e:
        logger.warning(f"Query failed: {e}")
        return []


@router.get("", response_model=CopilotAnalyticsResponse)
async def get_copilot_analytics():
    """Get complete Copilot analytics for enrolled learners."""
    stats = await get_copilot_stats()
    by_learner_status = await get_copilot_by_learner_status()
    by_region = await get_copilot_by_region()
    cert_comparison = await get_copilot_cert_comparison()
    
    return CopilotAnalyticsResponse(
        stats=stats,
        by_learner_status=by_learner_status,
        by_region=by_region,
        cert_comparison=cert_comparison,
        source="enriched",
    )
