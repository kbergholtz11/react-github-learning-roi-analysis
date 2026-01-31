"""Learners API routes with advanced filtering."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

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
    search: Optional[str] = Query(None, description="Search by email or username"),
    status: Optional[LearnerStatus] = Query(None, description="Filter by learner status"),
    certified: Optional[bool] = Query(None, description="Filter by certification status"),
    min_certs: Optional[int] = Query(None, ge=0, description="Minimum certifications"),
    max_certs: Optional[int] = Query(None, ge=0, description="Maximum certifications"),
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
        
        # NOTE: Kusto search was removed - not fully implemented.
        # Search uses CSV/enriched data. For live queries, use /api/query.
        
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
            try:
                rows = kusto.execute_query(
                    LearnerQueries.search_learners(q, limit=limit)
                )
                return {
                    "results": rows,
                    "count": len(rows),
                    "source": "kusto",
                }
            except Exception as kusto_err:
                logger.warning(f"Kusto quick search failed, falling back to CSV: {kusto_err}")
        
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
        # NOTE: Kusto profile query was removed - schema mapping was incomplete.
        # Profile data comes from CSV/enriched data.
        
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


@router.get("/{email}/exams")
async def get_learner_exams(email: str):
    """
    Get individual exam records for a specific learner.
    
    Returns all exam attempts with:
    - Exam code and name
    - Date taken
    - Exam status (Passed, Failed, No Show, Scheduled, Canceled)
    - Score percentage (when available, FY26 Pearson exams)
    - Attempt number (sequential)
    - Days since previous exam
    
    Data is pulled from both FY22-25 (gh-analytics) and FY26 (Pearson) sources.
    """
    from app.csv_service import get_individual_exams, normalize_cert_name
    from app.config import CLUSTER_CSE
    
    try:
        kusto = get_kusto_service()
        
        if kusto.is_available:
            try:
                rows = kusto.execute_query(
                    LearnerQueries.get_individual_exams_by_email(email),
                    cluster=CLUSTER_CSE  # Use config constant for cluster name
                )
                if rows:
                    # Normalize exam names and calculate time between exams
                    exams = []
                    prev_date = None
                    for row in rows:
                        exam_date = row.get("exam_date")
                        days_since_prev = None
                        if prev_date and exam_date:
                            try:
                                from datetime import datetime
                                d1 = datetime.fromisoformat(str(prev_date).replace('Z', '+00:00'))
                                d2 = datetime.fromisoformat(str(exam_date).replace('Z', '+00:00'))
                                days_since_prev = (d2 - d1).days
                            except:
                                pass
                        
                        exam_status = row.get("exam_status", "")
                        if not exam_status:
                            exam_status = "Passed" if row.get("passed", False) else "Failed"
                        
                        exams.append({
                            "exam_code": row.get("exam_code", ""),
                            "exam_name": normalize_cert_name(row.get("exam_name", "")),
                            "exam_date": str(exam_date) if exam_date else None,
                            "exam_status": exam_status,
                            "passed": exam_status == "Passed",
                            "score_percent": row.get("score_percent"),
                            "attempt_number": row.get("attempt_number", 1),
                            "days_since_previous": days_since_prev,
                        })
                        prev_date = exam_date
                    
                    # Calculate status counts
                    status_counts = {}
                    for e in exams:
                        status = e["exam_status"]
                        status_counts[status] = status_counts.get(status, 0) + 1
                    
                    return {
                        "email": email,
                        "exams": exams,
                        "total_exams": len(exams),
                        "passed_count": status_counts.get("Passed", 0),
                        "failed_count": status_counts.get("Failed", 0),
                        "status_breakdown": status_counts,
                        "source": "kusto",
                    }
            except Exception as kusto_err:
                logger.warning(f"Kusto exam query failed, falling back to CSV: {kusto_err}")
        
        # Fall back to CSV data
        exams = get_individual_exams(email)
        
        # Calculate status counts
        status_counts = {}
        for e in exams:
            status = e.get("exam_status", "Passed" if e.get("passed") else "Failed")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "email": email,
            "exams": exams,
            "total_exams": len(exams),
            "passed_count": status_counts.get("Passed", 0),
            "failed_count": status_counts.get("Failed", 0),
            "status_breakdown": status_counts,
            "source": "csv",
        }
        
    except Exception as e:
        logger.error(f"Error getting learner exams: {e}")
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
