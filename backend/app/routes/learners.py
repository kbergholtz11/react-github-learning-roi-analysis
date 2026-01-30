"""Learners API routes with advanced filtering."""

import logging

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.csv_service import get_certified_users, get_learners, get_unified_users
from app.kusto import get_kusto_service, LearnerQueries
from app.models import (
    CertifiedUser,
    LearnerFilters,
    LearnerStatus,
    LearnersResponse,
    UserProfile,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/learners", tags=["learners"])


@router.get("", response_model=LearnersResponse)
async def list_learners(
    search: str | None = Query(None, description="Search by email or username"),
    status: LearnerStatus | None = Query(None, description="Filter by learner status"),
    certified: bool | None = Query(None, description="Filter by certification status"),
    min_certs: int | None = Query(None, ge=0, description="Minimum certifications"),
    max_certs: int | None = Query(None, ge=0, description="Maximum certifications"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Results per page"),
):
    """
    List learners with filtering and pagination.
    
    Supports complex filtering:
    - Text search across email and username
    - Filter by learner status (Champion, Specialist, etc.)
    - Filter by certification status
    - Filter by number of certifications
    """
    try:
        filters = LearnerFilters(
            search=search,
            learner_status=status,
            is_certified=certified,
            min_certs=min_certs,
            max_certs=max_certs,
            page=page,
            page_size=page_size,
        )
        
        kusto = get_kusto_service()
        
        if kusto.is_available and search:
            # Use Kusto for search (faster on large datasets)
            logger.info(f"Searching learners via Kusto: {search}")
            rows = kusto.execute_query(LearnerQueries.search_learners(search, limit=page_size))
            # Transform Kusto results to model
            # This would need mapping to actual schema
        
        # Use CSV data
        result = get_learners(filters)
        
        return LearnersResponse(**result)
        
    except Exception as e:
        logger.error(f"Error listing learners: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_learners(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results"),
):
    """
    Quick search endpoint for autocomplete.
    
    Returns minimal learner info for fast responses.
    Uses Kusto when available for sub-100ms responses.
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            rows = kusto.execute_query(
                LearnerQueries.search_learners(q, limit=limit)
            )
            return {
                "results": rows,
                "count": len(rows),
                "source": "kusto",
            }
        
        # Fall back to CSV
        filters = LearnerFilters(search=q, page_size=limit)
        result = get_learners(filters)
        
        return {
            "results": [
                {
                    "email": u.email,
                    "user_handle": u.user_handle,
                    "learner_status": u.learner_status.value,
                }
                for u in result["learners"]
            ],
            "count": len(result["learners"]),
            "source": "csv",
        }
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{email}", response_model=UserProfile)
async def get_learner_profile(email: str):
    """
    Get detailed profile for a specific learner.
    
    Returns comprehensive data including:
    - Basic info (email, handle, status)
    - All certifications with dates
    - Learning activity metrics
    - Product usage data
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            rows = kusto.execute_query(
                LearnerQueries.get_learner_by_email(email)
            )
            if rows:
                row = rows[0]
                # Map Kusto response to UserProfile
                # This would need actual schema mapping
        
        # Find in CSV data
        certified = get_certified_users()
        user = next((u for u in certified if u.email == email), None)
        
        if not user:
            unified = get_unified_users()
            unified_user = next((u for u in unified if u.email == email), None)
            
            if not unified_user:
                raise HTTPException(status_code=404, detail="Learner not found")
            
            return UserProfile(
                email=unified_user.email,
                user_handle=unified_user.user_handle,
                learner_status=unified_user.learner_status,
                journey_stage=unified_user.journey_stage,
                certifications=[],
                total_certs=0,
                first_cert_date=None,
                latest_cert_date=None,
                learning_hours=0,
                product_usage_hours=0,
                events_attended=unified_user.events_registered,
                top_products=[],
                activity_trend=[],
            )
        
        return UserProfile(
            email=user.email,
            user_handle=user.user_handle,
            learner_status=user.learner_status,
            journey_stage=user.journey_stage,
            certifications=user.cert_titles,
            total_certs=user.total_certs,
            first_cert_date=user.first_cert_date,
            latest_cert_date=user.latest_cert_date,
            learning_hours=0,  # Would come from learning activity
            product_usage_hours=0,  # Would come from product usage
            events_attended=0,
            top_products=[user.cert_product_focus] if user.cert_product_focus else [],
            activity_trend=[],
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting learner profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{status}")
async def get_learners_by_status(
    status: LearnerStatus,
    limit: int = Query(100, ge=1, le=500),
):
    """
    Get all learners with a specific status.
    
    Useful for:
    - Exporting Champions for recognition
    - Finding Specialists for product feedback
    - Identifying Learning users for engagement
    """
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            rows = kusto.execute_query(
                LearnerQueries.get_learners_by_status(status.value, limit=limit)
            )
            return {
                "learners": rows,
                "count": len(rows),
                "status": status.value,
                "source": "kusto",
            }
        
        # CSV fallback
        filters = LearnerFilters(learner_status=status, page_size=limit)
        result = get_learners(filters)
        
        return {
            "learners": [
                {
                    "email": u.email,
                    "user_handle": u.user_handle,
                    "total_certs": u.total_certs if hasattr(u, "total_certs") else 0,
                    "journey_stage": u.journey_stage,
                }
                for u in result["learners"]
            ],
            "count": result["total"],
            "status": status.value,
            "source": "csv",
        }
        
    except Exception as e:
        logger.error(f"Error getting learners by status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/certified/recent")
async def get_recent_certifications(
    days: int = Query(30, ge=1, le=365, description="Days to look back"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Get recently certified users.
    
    Useful for:
    - Tracking certification velocity
    - Celebrating recent achievements
    - Identifying trends
    """
    from datetime import datetime, timedelta
    
    try:
        cutoff = datetime.now() - timedelta(days=days)
        certified = get_certified_users()
        
        recent = []
        for user in certified:
            if user.first_cert_date:
                try:
                    cert_date = datetime.strptime(user.first_cert_date, "%Y-%m-%d")
                    if cert_date >= cutoff:
                        recent.append({
                            "email": user.email,
                            "user_handle": user.user_handle,
                            "learner_status": user.learner_status.value,
                            "cert_date": user.first_cert_date,
                            "total_certs": user.total_certs,
                            "cert_titles": user.cert_titles,
                        })
                except ValueError:
                    continue
        
        # Sort by date descending
        recent.sort(key=lambda x: x["cert_date"], reverse=True)
        
        return {
            "learners": recent[:limit],
            "count": len(recent),
            "days": days,
        }
        
    except Exception as e:
        logger.error(f"Error getting recent certifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))
