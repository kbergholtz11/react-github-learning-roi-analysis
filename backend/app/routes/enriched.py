"""
Enriched Learners API routes - Uses DuckDB for fast queries.

Provides endpoints for querying enriched learner data with full
company/demographics/product usage information.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, Request

from app.database import get_database, LearnerQueries
from app.config import get_settings
from app.middleware.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/enriched", tags=["enriched"])


@router.get("/learners")
async def get_enriched_learners(
    search: Optional[str] = Query(None, description="Search by email, username, or name"),
    status: Optional[str] = Query(None, description="Filter by learner_status"),
    segment: Optional[str] = Query(None, description="Filter by insight segment (at-risk, rising-stars, ready-to-advance, inactive, high-value)"),
    company: Optional[str] = Query(None, description="Filter by company name (partial match)"),
    country: Optional[str] = Query(None, description="Filter by country code"),
    region: Optional[str] = Query(None, description="Filter by region (AMER, EMEA, APAC)"),
    uses_copilot: Optional[bool] = Query(None, description="Filter by Copilot usage"),
    is_certified: Optional[bool] = Query(None, description="Filter by certification status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
) -> Dict[str, Any]:
    """
    Get enriched learners with comprehensive filtering.
    
    Uses DuckDB for sub-20ms query performance.
    
    Returns:
        - learners: List of enriched learner records
        - total_count: Total matching records (for pagination)
        - count: Number of records returned
        - limit: Requested limit
        - offset: Requested offset
    """
    try:
        db = get_database()
        
        if not db.is_available:
            raise HTTPException(
                status_code=503,
                detail="Learner database not available. Run sync-enriched-learners.py first."
            )
        
        # Get total count for pagination
        total_count = LearnerQueries.get_total_count(
            search=search,
            status=status,
            segment=segment,
            company=company,
            country=country,
            region=region,
            uses_copilot=uses_copilot,
            is_certified=is_certified,
        )
        
        learners = LearnerQueries.get_learners(
            search=search,
            status=status,
            segment=segment,
            company=company,
            country=country,
            region=region,
            uses_copilot=uses_copilot,
            is_certified=is_certified,
            limit=limit,
            offset=offset,
        )
        
        return {
            "learners": learners,
            "total_count": total_count,
            "count": len(learners),
            "limit": limit,
            "offset": offset,
            "source": "duckdb",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying enriched learners: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learners/search")
async def search_enriched_learners(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
) -> Dict[str, Any]:
    """
    Full-text search across learner fields.
    
    Searches: email, userhandle, first_name, last_name, company_name
    """
    try:
        learners = LearnerQueries.search_learners(q, limit=limit)
        
        return {
            "results": learners,
            "count": len(learners),
            "query": q,
        }
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learners/by-email/{email}")
async def get_learner_by_email(email: str) -> Dict[str, Any]:
    """Get enriched learner details by email."""
    try:
        learner = LearnerQueries.get_learner_by_email(email)
        
        if not learner:
            raise HTTPException(status_code=404, detail="Learner not found")
        
        return learner
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting learner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learners/by-id/{dotcom_id}")
async def get_learner_by_id(dotcom_id: int) -> Dict[str, Any]:
    """Get enriched learner details by dotcom_id."""
    try:
        learner = LearnerQueries.get_learner_by_dotcom_id(dotcom_id)
        
        if not learner:
            raise HTTPException(status_code=404, detail="Learner not found")
        
        return learner
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting learner: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_enriched_stats() -> Dict[str, Any]:
    """
    Get aggregate statistics from enriched data.
    
    Returns:
        - total_learners
        - certified_learners
        - total_certifications
        - copilot_users
        - actions_users
        - security_users
        - total_arr
        - unique_companies
        - unique_countries
    """
    try:
        stats = LearnerQueries.get_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/by-region")
async def get_stats_by_region() -> List[Dict[str, Any]]:
    """Get statistics grouped by region."""
    try:
        return LearnerQueries.get_stats_by_region()
    except Exception as e:
        logger.error(f"Error getting region stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/by-status")
async def get_stats_by_status() -> List[Dict[str, Any]]:
    """Get statistics grouped by learner status."""
    try:
        return LearnerQueries.get_stats_by_status()
    except Exception as e:
        logger.error(f"Error getting status stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/growth")
async def get_growth_metrics() -> Dict[str, Any]:
    """Get growth and activity metrics for journey dashboard.
    
    Returns:
        - total_learners: Total number of learners
        - active_learners: Learners with any activity
        - engaged_learners: Learners with 10+ engagement events
        - highly_engaged: Learners with 100+ engagement events
        - product_users: Learners using any GitHub product
        - with_certifications: Learners with certifications
    """
    try:
        return LearnerQueries.get_growth_metrics()
    except Exception as e:
        logger.error(f"Error getting growth metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/segments")
async def get_segment_counts() -> Dict[str, Any]:
    """
    Get insight segment counts for the Talent Intelligence dashboard.
    
    Returns counts for:
        - all: Total learners
        - at_risk: Failed exams >= 2 OR (total_exams >= 2 AND exams_passed = 0) OR low quality
        - rising_stars: Multi-certified (2+) or Champion/Specialist status
        - ready_to_advance: 1 cert + product usage, or learning with high Copilot days
        - inactive: No activity in 90+ days
        - high_value: Champion/Specialist/Partner Certified with product usage
    """
    try:
        db = get_database()
        
        # Execute segment count queries
        result = db.query("""
            SELECT 
                COUNT(*) as total,
                
                -- At Risk: Failed exams >= 2 OR (total >= 2 AND passed = 0) OR low quality
                SUM(CASE WHEN 
                    (COALESCE(total_exams, 0) - COALESCE(exams_passed, 0) >= 2) OR 
                    (COALESCE(total_exams, 0) >= 2 AND COALESCE(exams_passed, 0) = 0) OR
                    (data_quality_level = 'low' AND COALESCE(total_exams, 0) > 0)
                THEN 1 ELSE 0 END) as at_risk,
                
                -- Rising Stars: Multi-certified (2+) or Champion/Specialist
                SUM(CASE WHEN 
                    COALESCE(exams_passed, 0) >= 2 OR 
                    learner_status IN ('Multi-Certified', 'Specialist', 'Champion')
                THEN 1 ELSE 0 END) as rising_stars,
                
                -- Ready to Advance: 1 cert + product usage, or Learning/Engaged with high Copilot
                SUM(CASE WHEN 
                    (COALESCE(exams_passed, 0) = 1 AND (COALESCE(uses_copilot, false) = true OR COALESCE(uses_actions, false) = true)) OR
                    (learner_status = 'Certified' AND COALESCE(copilot_days, 0) > 30) OR
                    (learner_status IN ('Learning', 'Engaged') AND COALESCE(copilot_days, 0) > 60)
                THEN 1 ELSE 0 END) as ready_to_advance,
                
                -- Inactive: No activity in 90+ days (using last_activity column)
                SUM(CASE WHEN 
                    last_activity IS NULL OR
                    TRY_CAST(last_activity AS DATE) < CURRENT_DATE - INTERVAL '90 days'
                THEN 1 ELSE 0 END) as inactive,
                
                -- High Value: Champion/Specialist/Partner Certified with product usage
                SUM(CASE WHEN 
                    learner_status IN ('Champion', 'Specialist', 'Partner Certified') AND
                    (COALESCE(uses_copilot, false) = true OR COALESCE(uses_actions, false) = true)
                THEN 1 ELSE 0 END) as high_value
                
            FROM learners_enriched
        """)
        
        if result:
            row = result[0]
            return {
                "all": int(row.get("total", 0) or 0),
                "at_risk": int(row.get("at_risk", 0) or 0),
                "rising_stars": int(row.get("rising_stars", 0) or 0),
                "ready_to_advance": int(row.get("ready_to_advance", 0) or 0),
                "inactive": int(row.get("inactive", 0) or 0),
                "high_value": int(row.get("high_value", 0) or 0),
            }
        
        return {
            "all": 0, "at_risk": 0, "rising_stars": 0,
            "ready_to_advance": 0, "inactive": 0, "high_value": 0
        }
        
    except Exception as e:
        logger.error(f"Error getting segment counts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/skill-maturity")
async def get_skill_maturity_distribution() -> Dict[str, Any]:
    """
    Get skill maturity level distribution across all learners.
    
    Returns:
        - distribution: List of {level, count, percentage, avgScore}
        - total: Total learners with skill maturity data
        - avgScore: Overall average skill maturity score
    """
    try:
        db = get_database()
        
        result = db.query("""
            SELECT 
                skill_maturity_level as level,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
                ROUND(AVG(COALESCE(skill_maturity_score, 0)), 1) as avg_score
            FROM learners_enriched
            WHERE skill_maturity_level IS NOT NULL
            GROUP BY skill_maturity_level
            ORDER BY avg_score DESC
        """)
        
        # Also get product adoption by maturity level
        adoption_result = db.query("""
            SELECT 
                skill_maturity_level as level,
                ROUND(AVG(CASE WHEN uses_copilot THEN 1 ELSE 0 END) * 100, 1) as copilot_pct,
                ROUND(AVG(CASE WHEN uses_actions THEN 1 ELSE 0 END) * 100, 1) as actions_pct,
                ROUND(AVG(CASE WHEN uses_security THEN 1 ELSE 0 END) * 100, 1) as security_pct,
                ROUND(AVG(COALESCE(products_adopted_count, 0)), 1) as avg_products,
                ROUND(AVG(COALESCE(exams_passed, 0)), 2) as avg_certs
            FROM learners_enriched
            WHERE skill_maturity_level IS NOT NULL
            GROUP BY skill_maturity_level
        """)
        
        # Convert adoption results to a lookup dict
        adoption_by_level = {}
        if adoption_result:
            for row in adoption_result:
                adoption_by_level[row.get("level")] = {
                    "copilot_pct": float(row.get("copilot_pct", 0) or 0),
                    "actions_pct": float(row.get("actions_pct", 0) or 0),
                    "security_pct": float(row.get("security_pct", 0) or 0),
                    "avg_products": float(row.get("avg_products", 0) or 0),
                    "avg_certs": float(row.get("avg_certs", 0) or 0),
                }
        
        if result:
            distribution = []
            total = 0
            weighted_score = 0
            
            for row in result:
                level = row.get("level")
                count = int(row.get("count", 0) or 0)
                avg_score = float(row.get("avg_score", 0) or 0)
                total += count
                weighted_score += count * avg_score
                
                adoption = adoption_by_level.get(level, {})
                
                distribution.append({
                    "level": level,
                    "count": count,
                    "percentage": float(row.get("percentage", 0) or 0),
                    "avgScore": avg_score,
                    "copilot_pct": adoption.get("copilot_pct", 0),
                    "actions_pct": adoption.get("actions_pct", 0),
                    "security_pct": adoption.get("security_pct", 0),
                    "avg_products": adoption.get("avg_products", 0),
                    "avg_certs": adoption.get("avg_certs", 0),
                })
            
            return {
                "distribution": distribution,
                "total": total,
                "avgScore": round(weighted_score / total, 1) if total > 0 else 0,
            }
        
        return {"distribution": [], "total": 0, "avgScore": 0}
        
    except Exception as e:
        logger.error(f"Error getting skill maturity distribution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/skills-analytics")
async def get_skills_analytics() -> Dict[str, Any]:
    """
    Comprehensive Skills Analytics endpoint.
    
    Returns analytics about:
    - Skills course engagement (by category: AI, Actions, Git, Security)
    - Skills → Product adoption correlation
    - Skills completion patterns
    - Skills vs Certification comparison
    """
    try:
        db = get_database()
        
        if not db.is_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Overall skills stats
        overall_query = """
            SELECT
                COUNT(*) as total_learners,
                SUM(CASE WHEN COALESCE(skills_count, 0) > 0 THEN 1 ELSE 0 END) as users_with_skills,
                SUM(CASE WHEN COALESCE(skills_page_views, 0) > 0 THEN 1 ELSE 0 END) as users_with_skills_views,
                SUM(COALESCE(skills_count, 0)) as total_skills_completed,
                AVG(CASE WHEN COALESCE(skills_count, 0) > 0 THEN skills_count ELSE NULL END) as avg_skills_per_user,
                SUM(COALESCE(skills_page_views, 0)) as total_skills_page_views,
                AVG(CASE WHEN COALESCE(skills_page_views, 0) > 0 THEN skills_page_views ELSE NULL END) as avg_page_views,
                SUM(COALESCE(ai_skills_count, 0)) as total_ai_skills,
                SUM(COALESCE(actions_skills_count, 0)) as total_actions_skills,
                SUM(COALESCE(git_skills_count, 0)) as total_git_skills,
                SUM(COALESCE(security_skills_count, 0)) as total_security_skills
            FROM learners_enriched
        """
        overall = db.query(overall_query)
        overall_data = overall[0] if overall else {}
        
        # Skills by category - users who completed each category
        category_query = """
            SELECT
                'AI/Copilot' as category,
                SUM(CASE WHEN COALESCE(ai_skills_count, 0) > 0 THEN 1 ELSE 0 END) as users,
                SUM(COALESCE(ai_skills_count, 0)) as completions,
                AVG(CASE WHEN COALESCE(ai_skills_count, 0) > 0 THEN ai_skills_count ELSE NULL END) as avg_per_user
            FROM learners_enriched
            UNION ALL
            SELECT
                'Actions/CI-CD' as category,
                SUM(CASE WHEN COALESCE(actions_skills_count, 0) > 0 THEN 1 ELSE 0 END) as users,
                SUM(COALESCE(actions_skills_count, 0)) as completions,
                AVG(CASE WHEN COALESCE(actions_skills_count, 0) > 0 THEN actions_skills_count ELSE NULL END) as avg_per_user
            FROM learners_enriched
            UNION ALL
            SELECT
                'Git/GitHub Basics' as category,
                SUM(CASE WHEN COALESCE(git_skills_count, 0) > 0 THEN 1 ELSE 0 END) as users,
                SUM(COALESCE(git_skills_count, 0)) as completions,
                AVG(CASE WHEN COALESCE(git_skills_count, 0) > 0 THEN git_skills_count ELSE NULL END) as avg_per_user
            FROM learners_enriched
            UNION ALL
            SELECT
                'Security' as category,
                SUM(CASE WHEN COALESCE(security_skills_count, 0) > 0 THEN 1 ELSE 0 END) as users,
                SUM(COALESCE(security_skills_count, 0)) as completions,
                AVG(CASE WHEN COALESCE(security_skills_count, 0) > 0 THEN security_skills_count ELSE NULL END) as avg_per_user
            FROM learners_enriched
        """
        categories_raw = db.query(category_query)
        
        # Skills → Product adoption correlation
        skills_adoption_query = """
            WITH skills_segments AS (
                SELECT
                    CASE
                        WHEN COALESCE(skills_count, 0) >= 5 THEN '5+ Skills'
                        WHEN COALESCE(skills_count, 0) >= 3 THEN '3-4 Skills'
                        WHEN COALESCE(skills_count, 0) >= 1 THEN '1-2 Skills'
                        ELSE 'No Skills'
                    END as segment,
                    CASE
                        WHEN COALESCE(skills_count, 0) >= 5 THEN 1
                        WHEN COALESCE(skills_count, 0) >= 3 THEN 2
                        WHEN COALESCE(skills_count, 0) >= 1 THEN 3
                        ELSE 4
                    END as sort_order,
                    COALESCE(uses_copilot, false) as uses_copilot,
                    COALESCE(uses_actions, false) as uses_actions,
                    COALESCE(uses_security, false) as uses_security,
                    COALESCE(copilot_days_90d, 0) as copilot_days,
                    COALESCE(exams_passed, 0) as certs
                FROM learners_enriched
            )
            SELECT
                segment,
                sort_order,
                COUNT(*) as users,
                ROUND(AVG(CASE WHEN uses_copilot THEN 100.0 ELSE 0 END), 1) as copilot_rate,
                ROUND(AVG(CASE WHEN uses_actions THEN 100.0 ELSE 0 END), 1) as actions_rate,
                ROUND(AVG(CASE WHEN uses_security THEN 100.0 ELSE 0 END), 1) as security_rate,
                ROUND(AVG(copilot_days), 1) as avg_copilot_days,
                ROUND(AVG(certs), 2) as avg_certs
            FROM skills_segments
            GROUP BY segment, sort_order
            ORDER BY sort_order
        """
        skills_adoption_raw = db.query(skills_adoption_query)
        
        # Skills category → Product adoption (which skills correlate with which products)
        category_adoption_query = """
            SELECT
                'AI Skills → Copilot' as correlation,
                ROUND(AVG(CASE WHEN COALESCE(ai_skills_count, 0) > 0 AND COALESCE(uses_copilot, false) THEN 100.0 
                          WHEN COALESCE(ai_skills_count, 0) > 0 THEN 0 
                          ELSE NULL END), 1) as rate_with_skill,
                ROUND(AVG(CASE WHEN COALESCE(ai_skills_count, 0) = 0 AND COALESCE(uses_copilot, false) THEN 100.0 
                          WHEN COALESCE(ai_skills_count, 0) = 0 THEN 0 
                          ELSE NULL END), 1) as rate_without_skill
            FROM learners_enriched
            UNION ALL
            SELECT
                'Actions Skills → Actions' as correlation,
                ROUND(AVG(CASE WHEN COALESCE(actions_skills_count, 0) > 0 AND COALESCE(uses_actions, false) THEN 100.0 
                          WHEN COALESCE(actions_skills_count, 0) > 0 THEN 0 
                          ELSE NULL END), 1) as rate_with_skill,
                ROUND(AVG(CASE WHEN COALESCE(actions_skills_count, 0) = 0 AND COALESCE(uses_actions, false) THEN 100.0 
                          WHEN COALESCE(actions_skills_count, 0) = 0 THEN 0 
                          ELSE NULL END), 1) as rate_without_skill
            FROM learners_enriched
            UNION ALL
            SELECT
                'Security Skills → Security' as correlation,
                ROUND(AVG(CASE WHEN COALESCE(security_skills_count, 0) > 0 AND COALESCE(uses_security, false) THEN 100.0 
                          WHEN COALESCE(security_skills_count, 0) > 0 THEN 0 
                          ELSE NULL END), 1) as rate_with_skill,
                ROUND(AVG(CASE WHEN COALESCE(security_skills_count, 0) = 0 AND COALESCE(uses_security, false) THEN 100.0 
                          WHEN COALESCE(security_skills_count, 0) = 0 THEN 0 
                          ELSE NULL END), 1) as rate_without_skill
            FROM learners_enriched
        """
        category_adoption_raw = db.query(category_adoption_query)
        
        # Skills vs Certification comparison
        skills_vs_certs_query = """
            SELECT
                CASE
                    WHEN COALESCE(exams_passed, 0) > 0 AND COALESCE(skills_count, 0) > 0 THEN 'Both'
                    WHEN COALESCE(exams_passed, 0) > 0 THEN 'Cert Only'
                    WHEN COALESCE(skills_count, 0) > 0 THEN 'Skills Only'
                    ELSE 'Neither'
                END as segment,
                COUNT(*) as users,
                ROUND(AVG(CASE WHEN COALESCE(uses_copilot, false) THEN 100.0 ELSE 0 END), 1) as copilot_rate,
                ROUND(AVG(CASE WHEN COALESCE(uses_actions, false) THEN 100.0 ELSE 0 END), 1) as actions_rate,
                ROUND(AVG(COALESCE(copilot_days_90d, 0)), 1) as avg_copilot_days,
                ROUND(AVG(COALESCE(skill_maturity_score, 0)), 1) as avg_maturity
            FROM learners_enriched
            GROUP BY 1
            ORDER BY 
                CASE segment
                    WHEN 'Both' THEN 1
                    WHEN 'Cert Only' THEN 2
                    WHEN 'Skills Only' THEN 3
                    ELSE 4
                END
        """
        skills_vs_certs_raw = db.query(skills_vs_certs_query)
        
        # Skill maturity score distribution
        maturity_query = """
            SELECT
                CASE
                    WHEN skill_maturity_score >= 80 THEN 'Expert (80+)'
                    WHEN skill_maturity_score >= 60 THEN 'Advanced (60-79)'
                    WHEN skill_maturity_score >= 40 THEN 'Intermediate (40-59)'
                    WHEN skill_maturity_score >= 20 THEN 'Beginner (20-39)'
                    ELSE 'Novice (0-19)'
                END as level,
                CASE
                    WHEN skill_maturity_score >= 80 THEN 1
                    WHEN skill_maturity_score >= 60 THEN 2
                    WHEN skill_maturity_score >= 40 THEN 3
                    WHEN skill_maturity_score >= 20 THEN 4
                    ELSE 5
                END as sort_order,
                COUNT(*) as users,
                ROUND(AVG(skill_maturity_score), 1) as avg_score,
                ROUND(AVG(CASE WHEN COALESCE(uses_copilot, false) THEN 100.0 ELSE 0 END), 1) as copilot_rate
            FROM learners_enriched
            GROUP BY 1, 2
            ORDER BY sort_order
        """
        maturity_raw = db.query(maturity_query)
        
        # Format response
        categories = [
            {
                "name": row.get("category"),
                "users": int(row.get("users") or 0),
                "completions": int(row.get("completions") or 0),
                "avgPerUser": round(float(row.get("avg_per_user") or 0), 1),
            }
            for row in categories_raw
        ]
        
        skills_adoption = [
            {
                "segment": row.get("segment"),
                "users": int(row.get("users") or 0),
                "copilotRate": float(row.get("copilot_rate") or 0),
                "actionsRate": float(row.get("actions_rate") or 0),
                "securityRate": float(row.get("security_rate") or 0),
                "avgCopilotDays": float(row.get("avg_copilot_days") or 0),
                "avgCerts": float(row.get("avg_certs") or 0),
            }
            for row in skills_adoption_raw
        ]
        
        category_correlations = [
            {
                "name": row.get("correlation"),
                "rateWithSkill": float(row.get("rate_with_skill") or 0),
                "rateWithoutSkill": float(row.get("rate_without_skill") or 0),
                "lift": round((float(row.get("rate_with_skill") or 0) - float(row.get("rate_without_skill") or 0)), 1),
            }
            for row in category_adoption_raw
        ]
        
        skills_vs_certs = [
            {
                "segment": row.get("segment"),
                "users": int(row.get("users") or 0),
                "copilotRate": float(row.get("copilot_rate") or 0),
                "actionsRate": float(row.get("actions_rate") or 0),
                "avgCopilotDays": float(row.get("avg_copilot_days") or 0),
                "avgMaturity": float(row.get("avg_maturity") or 0),
            }
            for row in skills_vs_certs_raw
        ]
        
        maturity_distribution = [
            {
                "level": row.get("level"),
                "users": int(row.get("users") or 0),
                "avgScore": float(row.get("avg_score") or 0),
                "copilotRate": float(row.get("copilot_rate") or 0),
            }
            for row in maturity_raw
        ]
        
        return {
            "overview": {
                "totalLearners": int(overall_data.get("total_learners") or 0),
                "usersWithSkills": int(overall_data.get("users_with_skills") or 0),
                "usersWithSkillsViews": int(overall_data.get("users_with_skills_views") or 0),
                "totalSkillsCompleted": int(overall_data.get("total_skills_completed") or 0),
                "avgSkillsPerUser": round(float(overall_data.get("avg_skills_per_user") or 0), 1),
                "totalPageViews": int(overall_data.get("total_skills_page_views") or 0),
                "avgPageViews": round(float(overall_data.get("avg_page_views") or 0), 1),
            },
            "byCategory": categories,
            "skillsToAdoption": skills_adoption,
            "categoryCorrelations": category_correlations,
            "skillsVsCerts": skills_vs_certs,
            "maturityDistribution": maturity_distribution,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting skills analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/product-adoption")
async def get_product_adoption_stats() -> Dict[str, Any]:
    """
    Get product adoption statistics across all learners.
    
    Returns:
        - products: List of {key, name, users, rate}
        - total_learners: Total learner count
        - avg_products: Average products adopted per learner
    """
    try:
        db = get_database()
        
        result = db.query("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                SUM(CASE WHEN uses_actions THEN 1 ELSE 0 END) as actions_users,
                SUM(CASE WHEN uses_security THEN 1 ELSE 0 END) as security_users,
                SUM(CASE WHEN copilot_ever_used THEN 1 ELSE 0 END) as copilot_ever,
                SUM(CASE WHEN actions_ever_used THEN 1 ELSE 0 END) as actions_ever,
                SUM(CASE WHEN security_ever_used THEN 1 ELSE 0 END) as security_ever,
                SUM(CASE WHEN pr_ever_used THEN 1 ELSE 0 END) as pr_ever,
                SUM(CASE WHEN issues_ever_used THEN 1 ELSE 0 END) as issues_ever,
                SUM(CASE WHEN code_search_ever_used THEN 1 ELSE 0 END) as code_search_ever,
                SUM(CASE WHEN packages_ever_used THEN 1 ELSE 0 END) as packages_ever,
                SUM(CASE WHEN projects_ever_used THEN 1 ELSE 0 END) as projects_ever,
                SUM(CASE WHEN discussions_ever_used THEN 1 ELSE 0 END) as discussions_ever,
                SUM(CASE WHEN pages_ever_used THEN 1 ELSE 0 END) as pages_ever,
                ROUND(AVG(COALESCE(products_adopted_count, 0)), 2) as avg_products
            FROM learners_enriched
        """)
        
        if result:
            row = result[0]
            total = int(row.get("total", 0) or 0)
            
            products = [
                {"key": "copilot", "name": "GitHub Copilot", "users90d": int(row.get("copilot_users", 0) or 0), "usersEver": int(row.get("copilot_ever", 0) or 0)},
                {"key": "actions", "name": "Actions", "users90d": int(row.get("actions_users", 0) or 0), "usersEver": int(row.get("actions_ever", 0) or 0)},
                {"key": "security", "name": "Security", "users90d": int(row.get("security_users", 0) or 0), "usersEver": int(row.get("security_ever", 0) or 0)},
                {"key": "pr", "name": "Pull Requests", "users90d": 0, "usersEver": int(row.get("pr_ever", 0) or 0)},
                {"key": "issues", "name": "Issues", "users90d": 0, "usersEver": int(row.get("issues_ever", 0) or 0)},
                {"key": "code_search", "name": "Code Search", "users90d": 0, "usersEver": int(row.get("code_search_ever", 0) or 0)},
                {"key": "packages", "name": "Packages", "users90d": 0, "usersEver": int(row.get("packages_ever", 0) or 0)},
                {"key": "projects", "name": "Projects", "users90d": 0, "usersEver": int(row.get("projects_ever", 0) or 0)},
                {"key": "discussions", "name": "Discussions", "users90d": 0, "usersEver": int(row.get("discussions_ever", 0) or 0)},
                {"key": "pages", "name": "Pages", "users90d": 0, "usersEver": int(row.get("pages_ever", 0) or 0)},
            ]
            
            for p in products:
                p["rate90d"] = round((p["users90d"] / total) * 100, 1) if total > 0 else 0
                p["rateEver"] = round((p["usersEver"] / total) * 100, 1) if total > 0 else 0
            
            return {
                "products": sorted(products, key=lambda x: x["rateEver"], reverse=True),
                "total_learners": total,
                "avg_products": float(row.get("avg_products", 0) or 0),
            }
        
        return {"products": [], "total_learners": 0, "avg_products": 0}
        
    except Exception as e:
        logger.error(f"Error getting product adoption stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/product-adoption-by-certification")
async def get_product_adoption_by_certification() -> Dict[str, Any]:
    """
    Get product adoption rates BEFORE vs AFTER certification for all 10 products.
    
    Compares:
    - "Learning" status users (pre-certification baseline)
    - "Certified" or higher status users (post-certification)
    
    Returns adoption rates for all tracked GitHub products.
    """
    try:
        db = get_database()
        
        # Query adoption rates split by certification status
        # "Learning" = before certification, "Certified+" = after certification
        result = db.query("""
            WITH status_groups AS (
                SELECT
                    CASE 
                        WHEN learner_status IN ('Certified', 'Multi-Certified', 'Specialist', 'Champion', 'Partner Certified')
                        THEN 'certified'
                        ELSE 'learning'
                    END as cert_status,
                    -- 90-day active usage
                    COALESCE(uses_copilot, false) as uses_copilot,
                    COALESCE(uses_actions, false) as uses_actions,
                    COALESCE(uses_security, false) as uses_security,
                    -- Ever used (365-day window)
                    COALESCE(copilot_ever_used, false) as copilot_ever,
                    COALESCE(actions_ever_used, false) as actions_ever,
                    COALESCE(security_ever_used, false) as security_ever,
                    COALESCE(pr_ever_used, false) as pr_ever,
                    COALESCE(issues_ever_used, false) as issues_ever,
                    COALESCE(code_search_ever_used, false) as code_search_ever,
                    COALESCE(packages_ever_used, false) as packages_ever,
                    COALESCE(projects_ever_used, false) as projects_ever,
                    COALESCE(discussions_ever_used, false) as discussions_ever,
                    COALESCE(pages_ever_used, false) as pages_ever
                FROM learners_enriched
            )
            SELECT 
                cert_status,
                COUNT(*) as total_users,
                -- 90-day adoption rates
                ROUND(AVG(CASE WHEN uses_copilot THEN 100.0 ELSE 0 END), 1) as copilot_90d,
                ROUND(AVG(CASE WHEN uses_actions THEN 100.0 ELSE 0 END), 1) as actions_90d,
                ROUND(AVG(CASE WHEN uses_security THEN 100.0 ELSE 0 END), 1) as security_90d,
                -- Ever used rates (365-day)
                ROUND(AVG(CASE WHEN copilot_ever THEN 100.0 ELSE 0 END), 1) as copilot_ever_pct,
                ROUND(AVG(CASE WHEN actions_ever THEN 100.0 ELSE 0 END), 1) as actions_ever_pct,
                ROUND(AVG(CASE WHEN security_ever THEN 100.0 ELSE 0 END), 1) as security_ever_pct,
                ROUND(AVG(CASE WHEN pr_ever THEN 100.0 ELSE 0 END), 1) as pr_ever_pct,
                ROUND(AVG(CASE WHEN issues_ever THEN 100.0 ELSE 0 END), 1) as issues_ever_pct,
                ROUND(AVG(CASE WHEN code_search_ever THEN 100.0 ELSE 0 END), 1) as code_search_ever_pct,
                ROUND(AVG(CASE WHEN packages_ever THEN 100.0 ELSE 0 END), 1) as packages_ever_pct,
                ROUND(AVG(CASE WHEN projects_ever THEN 100.0 ELSE 0 END), 1) as projects_ever_pct,
                ROUND(AVG(CASE WHEN discussions_ever THEN 100.0 ELSE 0 END), 1) as discussions_ever_pct,
                ROUND(AVG(CASE WHEN pages_ever THEN 100.0 ELSE 0 END), 1) as pages_ever_pct
            FROM status_groups
            GROUP BY cert_status
        """)
        
        if not result:
            return {"products": [], "learning_count": 0, "certified_count": 0}
        
        # Parse results into before/after format
        learning_data = None
        certified_data = None
        
        for row in result:
            status = row.get("cert_status")
            if status == "learning":
                learning_data = row
            elif status == "certified":
                certified_data = row
        
        if not learning_data or not certified_data:
            return {"products": [], "learning_count": 0, "certified_count": 0}
        
        # Build product comparison list
        products = [
            {
                "name": "GitHub Copilot",
                "key": "copilot",
                "category": "AI & Automation",
                "before": float(learning_data.get("copilot_90d", 0) or 0),
                "after": float(certified_data.get("copilot_90d", 0) or 0),
                "before_ever": float(learning_data.get("copilot_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("copilot_ever_pct", 0) or 0),
            },
            {
                "name": "GitHub Actions",
                "key": "actions",
                "category": "AI & Automation",
                "before": float(learning_data.get("actions_90d", 0) or 0),
                "after": float(certified_data.get("actions_90d", 0) or 0),
                "before_ever": float(learning_data.get("actions_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("actions_ever_pct", 0) or 0),
            },
            {
                "name": "Advanced Security",
                "key": "security",
                "category": "AI & Automation",
                "before": float(learning_data.get("security_90d", 0) or 0),
                "after": float(certified_data.get("security_90d", 0) or 0),
                "before_ever": float(learning_data.get("security_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("security_ever_pct", 0) or 0),
            },
            {
                "name": "Pull Requests",
                "key": "pr",
                "category": "Core Collaboration",
                "before_ever": float(learning_data.get("pr_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("pr_ever_pct", 0) or 0),
            },
            {
                "name": "Issues",
                "key": "issues",
                "category": "Core Collaboration",
                "before_ever": float(learning_data.get("issues_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("issues_ever_pct", 0) or 0),
            },
            {
                "name": "Code Search",
                "key": "code_search",
                "category": "Discovery & Navigation",
                "before_ever": float(learning_data.get("code_search_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("code_search_ever_pct", 0) or 0),
            },
            {
                "name": "Packages",
                "key": "packages",
                "category": "Ecosystem",
                "before_ever": float(learning_data.get("packages_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("packages_ever_pct", 0) or 0),
            },
            {
                "name": "Projects",
                "key": "projects",
                "category": "Project Management",
                "before_ever": float(learning_data.get("projects_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("projects_ever_pct", 0) or 0),
            },
            {
                "name": "Discussions",
                "key": "discussions",
                "category": "Community",
                "before_ever": float(learning_data.get("discussions_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("discussions_ever_pct", 0) or 0),
            },
            {
                "name": "Pages",
                "key": "pages",
                "category": "Publishing",
                "before_ever": float(learning_data.get("pages_ever_pct", 0) or 0),
                "after_ever": float(certified_data.get("pages_ever_pct", 0) or 0),
            },
        ]
        
        # Add computed fields
        for p in products:
            # Use "ever" metrics for products without 90-day tracking
            before = p.get("before") if "before" in p else p.get("before_ever", 0)
            after = p.get("after") if "after" in p else p.get("after_ever", 0)
            p["change"] = round(after - before, 1)
            p["change_pct"] = round(((after - before) / before * 100) if before > 0 else 0, 1)
        
        return {
            "products": products,
            "learning_count": int(learning_data.get("total_users", 0) or 0),
            "certified_count": int(certified_data.get("total_users", 0) or 0),
            "methodology": "Cross-sectional comparison: Learning status vs Certified+ status",
            "note": "Lower post-certification rates often reflect specialization (deep use of fewer products) rather than disengagement",
        }
        
    except Exception as e:
        logger.error(f"Error getting product adoption by certification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/certified-adoption-by-tenure")
async def get_certified_adoption_by_tenure() -> Dict[str, Any]:
    """
    Analyze product adoption through the certification journey for CERTIFIED LEARNERS:
    
    - Pre-Certification: Users who used each product BEFORE their first exam
      (identified by product_first_use < first_exam for accurate per-product tracking)
    - Recently Certified (0-90 days post-cert): Current 90-day usage
    - Established (91-365 days post-cert): Current 90-day usage  
    - Veteran (365+ days post-cert): Current 90-day usage
    
    This provides accurate pre-certification product usage based on per-product first-use timestamps.
    """
    try:
        db = get_database()
        
        # Query for certified learners by time since certification
        # Pre-cert: Uses per-product first_use dates for accurate tracking
        result = db.query("""
            WITH certified_only AS (
                SELECT
                    *,
                    TRY_CAST(first_exam AS DATE) as cert_date,
                    TRY_CAST(first_activity AS DATE) as activity_date,
                    DATEDIFF('day', TRY_CAST(first_exam AS DATE), CURRENT_DATE) as days_since_cert,
                    -- Per-product pre-certification flags using first_use dates
                    -- TRUE if they used the product BEFORE their certification exam
                    CASE WHEN TRY_CAST(copilot_first_use AS DATE) < TRY_CAST(first_exam AS DATE) THEN true ELSE false END as copilot_precert,
                    CASE WHEN TRY_CAST(actions_first_use AS DATE) < TRY_CAST(first_exam AS DATE) THEN true ELSE false END as actions_precert,
                    CASE WHEN TRY_CAST(security_first_use AS DATE) < TRY_CAST(first_exam AS DATE) THEN true ELSE false END as security_precert,
                    CASE WHEN TRY_CAST(pr_first_use AS DATE) < TRY_CAST(first_exam AS DATE) THEN true ELSE false END as pr_precert,
                    CASE WHEN TRY_CAST(issues_first_use AS DATE) < TRY_CAST(first_exam AS DATE) THEN true ELSE false END as issues_precert,
                    -- Legacy fallback for products without first_use (uses first_activity)
                    CASE WHEN TRY_CAST(first_activity AS DATE) < TRY_CAST(first_exam AS DATE) THEN true ELSE false END as had_precert_activity,
                    -- Time post-certification grouping
                    CASE 
                        WHEN TRY_CAST(first_exam AS DATE) >= CURRENT_DATE - INTERVAL '90 days' THEN 'recent'
                        WHEN TRY_CAST(first_exam AS DATE) >= CURRENT_DATE - INTERVAL '365 days' THEN 'established'
                        ELSE 'veteran'
                    END as time_post_cert
                FROM learners_enriched
                WHERE learner_status IN ('Certified', 'Multi-Certified', 'Specialist', 'Champion', 'Partner Certified')
                AND first_exam IS NOT NULL
            ),
            -- Pre-certification: Accurate per-product usage BEFORE certification
            pre_cert_usage AS (
                SELECT
                    'pre_cert' as time_post_cert,
                    COUNT(*) as total_users,
                    NULL::BIGINT as avg_days_since_cert,
                    ROUND(AVG(COALESCE(exams_passed, 0)), 2) as avg_certs,
                    -- Per-product pre-cert rates using accurate first_use dates
                    ROUND(SUM(CASE WHEN copilot_precert THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as copilot_rate,
                    ROUND(SUM(CASE WHEN actions_precert THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as actions_rate,
                    ROUND(SUM(CASE WHEN security_precert THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as security_rate,
                    ROUND(SUM(CASE WHEN pr_precert THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as pr_rate,
                    ROUND(SUM(CASE WHEN issues_precert THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as issues_rate,
                    -- These fallback to activity-based for now (no first_use column yet)
                    ROUND(SUM(CASE WHEN had_precert_activity AND code_search_days > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as code_search_rate,
                    ROUND(SUM(CASE WHEN had_precert_activity AND packages_days > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as packages_rate,
                    ROUND(SUM(CASE WHEN had_precert_activity AND projects_days > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as projects_rate,
                    ROUND(SUM(CASE WHEN had_precert_activity AND discussions_days > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as discussions_rate,
                    ROUND(SUM(CASE WHEN had_precert_activity AND pages_days > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as pages_rate,
                    -- Average days for users with pre-cert activity
                    ROUND(AVG(CASE WHEN copilot_precert THEN copilot_days ELSE NULL END), 1) as avg_copilot_days,
                    ROUND(AVG(CASE WHEN actions_precert THEN actions_days ELSE NULL END), 1) as avg_actions_days,
                    ROUND(AVG(CASE WHEN had_precert_activity THEN total_active_days ELSE NULL END), 1) as avg_active_days,
                    -- Count of products used pre-cert
                    ROUND(AVG(CASE WHEN had_precert_activity THEN 
                        (CASE WHEN copilot_precert THEN 1 ELSE 0 END) +
                        (CASE WHEN actions_precert THEN 1 ELSE 0 END) +
                        (CASE WHEN security_precert THEN 1 ELSE 0 END) +
                        (CASE WHEN pr_precert THEN 1 ELSE 0 END) +
                        (CASE WHEN issues_precert THEN 1 ELSE 0 END)
                    ELSE NULL END), 2) as avg_products,
                    ROUND(AVG(COALESCE(skills_count, 0)), 1) as avg_skills,
                    ROUND(AVG(COALESCE(learn_page_views, 0)), 0) as avg_learn_views,
                    0 as sort_order
                FROM certified_only
            ),
            -- Post-certification groups by time since certification
            post_cert_groups AS (
                SELECT 
                    time_post_cert,
                    COUNT(*) as total_users,
                    ROUND(AVG(days_since_cert), 0)::BIGINT as avg_days_since_cert,
                    ROUND(AVG(COALESCE(exams_passed, 0)), 2) as avg_certs,
                    -- 90-day active usage (current behavior)
                    ROUND(AVG(CASE WHEN uses_copilot THEN 100.0 ELSE 0 END), 1) as copilot_rate,
                    ROUND(AVG(CASE WHEN uses_actions THEN 100.0 ELSE 0 END), 1) as actions_rate,
                    ROUND(AVG(CASE WHEN uses_security THEN 100.0 ELSE 0 END), 1) as security_rate,
                    ROUND(AVG(CASE WHEN pr_ever_used THEN 100.0 ELSE 0 END), 1) as pr_rate,
                    ROUND(AVG(CASE WHEN issues_ever_used THEN 100.0 ELSE 0 END), 1) as issues_rate,
                    ROUND(AVG(CASE WHEN code_search_ever_used THEN 100.0 ELSE 0 END), 1) as code_search_rate,
                    ROUND(AVG(CASE WHEN packages_ever_used THEN 100.0 ELSE 0 END), 1) as packages_rate,
                    ROUND(AVG(CASE WHEN projects_ever_used THEN 100.0 ELSE 0 END), 1) as projects_rate,
                    ROUND(AVG(CASE WHEN discussions_ever_used THEN 100.0 ELSE 0 END), 1) as discussions_rate,
                    ROUND(AVG(CASE WHEN pages_ever_used THEN 100.0 ELSE 0 END), 1) as pages_rate,
                    ROUND(AVG(COALESCE(copilot_days_90d, 0)), 1) as avg_copilot_days,
                    ROUND(AVG(COALESCE(actions_days_90d, 0)), 1) as avg_actions_days,
                    ROUND(AVG(COALESCE(total_active_days_90d, 0)), 1) as avg_active_days,
                    ROUND(AVG(COALESCE(products_adopted_count, 0)), 2) as avg_products,
                    ROUND(AVG(COALESCE(skills_count, 0)), 1) as avg_skills,
                    ROUND(AVG(COALESCE(learn_page_views, 0)), 0) as avg_learn_views,
                    CASE time_post_cert 
                        WHEN 'recent' THEN 1 
                        WHEN 'established' THEN 2 
                        WHEN 'veteran' THEN 3 
                        ELSE 4 
                    END as sort_order
                FROM certified_only
                GROUP BY time_post_cert
            ),
            all_groups AS (
                SELECT * FROM pre_cert_usage
                UNION ALL
                SELECT * FROM post_cert_groups
            )
            SELECT * FROM all_groups ORDER BY sort_order
        """)
        
        if not result:
            return {"tenure_groups": [], "total_certified": 0, "total_pre_cert": 0}
        
        # Build time post-certification group data
        tenure_groups = []
        total_certified = 0
        pre_cert_count = 0
        
        for row in result:
            group_name = row.get("time_post_cert")
            count = int(row.get("total_users", 0) or 0)
            
            if group_name == "pre_cert":
                pre_cert_count = count
            else:
                total_certified += count
            
            copilot_rate = float(row.get("copilot_rate", 0) or 0)
            actions_rate = float(row.get("actions_rate", 0) or 0)
            security_rate = float(row.get("security_rate", 0) or 0)
            
            tenure_groups.append({
                "tenure": group_name,
                "label": {
                    "pre_cert": "Pre-Certification",
                    "recent": "0-90 Days Post-Cert",
                    "established": "91-365 Days Post-Cert",
                    "veteran": "365+ Days Post-Cert",
                }.get(group_name, group_name),
                "description": {
                    "pre_cert": "Product usage BEFORE certification (users whose first_activity < first_exam)",
                    "recent": "Current 90-day usage for learners 0-90 days post-certification",
                    "established": "Current 90-day usage for learners 91-365 days post-certification",
                    "veteran": "Current 90-day usage for learners 365+ days post-certification",
                }.get(group_name, ""),
                "count": count,
                "avg_days_since_cert": int(row.get("avg_days_since_cert") or 0) if row.get("avg_days_since_cert") is not None else None,
                "avg_certs": float(row.get("avg_certs", 0) or 0),
                "avg_skills": float(row.get("avg_skills", 0) or 0),
                "avg_learn_views": int(row.get("avg_learn_views", 0) or 0),
                "products": {
                    "copilot": {"rate_90d": copilot_rate, "rate_ever": copilot_rate, "avg_days": float(row.get("avg_copilot_days", 0) or 0)},
                    "actions": {"rate_90d": actions_rate, "rate_ever": actions_rate, "avg_days": float(row.get("avg_actions_days", 0) or 0)},
                    "security": {"rate_90d": security_rate, "rate_ever": security_rate},
                    "pr": {"rate_ever": float(row.get("pr_rate", 0) or 0)},
                    "issues": {"rate_ever": float(row.get("issues_rate", 0) or 0)},
                    "code_search": {"rate_ever": float(row.get("code_search_rate", 0) or 0)},
                    "packages": {"rate_ever": float(row.get("packages_rate", 0) or 0)},
                    "projects": {"rate_ever": float(row.get("projects_rate", 0) or 0)},
                    "discussions": {"rate_ever": float(row.get("discussions_rate", 0) or 0)},
                    "pages": {"rate_ever": float(row.get("pages_rate", 0) or 0)},
                },
                "avg_active_days": float(row.get("avg_active_days", 0) or 0),
                "avg_products": float(row.get("avg_products", 0) or 0),
            })
        
        return {
            "tenure_groups": tenure_groups,
            "total_certified": total_certified,
            "total_pre_cert": pre_cert_count,
            "methodology": "Pre-cert: Uses per-product first_use dates to accurately determine if each product was used BEFORE certification. Post-cert: Current 90-day usage segmented by time since certification.",
            "note": "Pre-certification shows % of learners who used each product before passing their certification exam, based on product_first_use < first_exam.",
        }
        
    except Exception as e:
        logger.error(f"Error getting certified adoption by tenure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/top")
async def get_top_companies(
    limit: int = Query(20, ge=1, le=100, description="Number of companies")
) -> List[Dict[str, Any]]:
    """
    Get top companies by learner count.
    
    Returns company stats including:
    - learner_count
    - certified_count
    - exams_passed
    - copilot_users
    - total_arr
    - regions
    """
    try:
        return LearnerQueries.get_top_companies(limit=limit)
    except Exception as e:
        logger.error(f"Error getting top companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/copilot-adoption")
async def get_copilot_adoption_analysis() -> List[Dict[str, Any]]:
    """
    Compare Copilot adoption between certified and non-certified learners.
    
    Key insight for ROI: Does certification correlate with Copilot adoption?
    """
    try:
        return LearnerQueries.get_copilot_adoption_by_cert_status()
    except Exception as e:
        logger.error(f"Error getting Copilot analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/learning-to-usage")
async def get_learning_to_usage_correlation() -> List[Dict[str, Any]]:
    """
    Analyze correlation between learning progress and product usage.
    
    Shows how learner status correlates with:
    - Copilot adoption %
    - Actions adoption %
    - Security adoption %
    - Average active days
    - Average engagement events
    """
    try:
        return LearnerQueries.get_learning_to_usage_correlation()
    except Exception as e:
        logger.error(f"Error getting correlation analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/learning-adoption")
async def get_learning_adoption_stats() -> Dict[str, Any]:
    """
    Comprehensive learning → product adoption analysis.
    
    Segments learners by learning type:
    - Multi-Certified: 2+ certifications
    - Certified: 1 certification  
    - Skills + Learn: Both activities, no cert
    - Skills Only: Skills courses only
    - Learn Only: GitHub Learn only
    - No Learning: Baseline (registered but no learning activity)
    
    Compares product adoption (Copilot, Actions, Security) across segments.
    """
    try:
        db = get_database()
        
        if not db.is_available:
            raise HTTPException(
                status_code=503,
                detail="Learner database not available"
            )
        
        # Get segment stats with product adoption
        segment_query = """
            WITH learning_segments AS (
                SELECT
                    dotcom_id,
                    -- Determine learning segment
                    CASE
                        WHEN COALESCE(exams_passed, 0) >= 2 THEN 'Multi-Certified'
                        WHEN COALESCE(exams_passed, 0) = 1 THEN 'Certified'
                        WHEN COALESCE(skills_count, 0) > 0 AND COALESCE(learn_page_views, 0) > 0 THEN 'Skills + Learn'
                        WHEN COALESCE(skills_count, 0) > 0 THEN 'Skills Only'
                        WHEN COALESCE(learn_page_views, 0) > 0 THEN 'Learn Only'
                        ELSE 'No Learning'
                    END as segment,
                    -- Product usage
                    COALESCE(uses_copilot, false) as uses_copilot,
                    COALESCE(uses_actions, false) as uses_actions,
                    COALESCE(uses_security, false) as uses_security,
                    COALESCE(copilot_days_90d, 0) as copilot_days,
                    COALESCE(actions_days_90d, 0) as actions_days,
                    COALESCE(security_days_90d, 0) as security_days,
                    COALESCE(exams_passed, 0) as cert_count,
                    COALESCE(skills_count, 0) as skills_count,
                    COALESCE(learn_page_views, 0) as learn_page_views
                FROM learners_enriched
            )
            SELECT
                segment,
                COUNT(*) as user_count,
                -- Product adoption rates (90-day)
                ROUND(AVG(CASE WHEN uses_copilot THEN 100.0 ELSE 0 END), 1) as copilot_adoption,
                ROUND(AVG(CASE WHEN uses_actions THEN 100.0 ELSE 0 END), 1) as actions_adoption,
                ROUND(AVG(CASE WHEN uses_security THEN 100.0 ELSE 0 END), 1) as security_adoption,
                -- Usage intensity
                ROUND(AVG(copilot_days), 1) as avg_copilot_days,
                ROUND(AVG(actions_days), 1) as avg_actions_days,
                ROUND(AVG(security_days), 1) as avg_security_days,
                -- Approximate Actions engagement level (0-5) based on days
                ROUND(
                    CASE 
                        WHEN AVG(actions_days) >= 18 THEN 4.5
                        WHEN AVG(actions_days) >= 10 THEN 3.0
                        WHEN AVG(actions_days) >= 5 THEN 2.0
                        WHEN AVG(actions_days) >= 1 THEN 1.0
                        ELSE 0.0
                    END, 1
                ) as avg_actions_level
            FROM learning_segments
            GROUP BY segment
            ORDER BY 
                CASE segment
                    WHEN 'Multi-Certified' THEN 1
                    WHEN 'Certified' THEN 2
                    WHEN 'Skills + Learn' THEN 3
                    WHEN 'Skills Only' THEN 4
                    WHEN 'Learn Only' THEN 5
                    ELSE 6
                END
        """
        
        segments = db.query(segment_query)
        
        # Get overall counts
        overall_query = """
            SELECT
                COUNT(*) as total_learners,
                SUM(CASE WHEN COALESCE(exams_passed, 0) >= 1 THEN 1 ELSE 0 END) as certified_count,
                SUM(CASE WHEN COALESCE(exams_passed, 0) = 0 AND COALESCE(skills_count, 0) > 0 AND COALESCE(learn_page_views, 0) = 0 THEN 1 ELSE 0 END) as skills_only_count,
                SUM(CASE WHEN COALESCE(exams_passed, 0) = 0 AND COALESCE(skills_count, 0) = 0 AND COALESCE(learn_page_views, 0) > 0 THEN 1 ELSE 0 END) as learn_only_count,
                SUM(CASE WHEN COALESCE(skills_count, 0) > 0 AND COALESCE(learn_page_views, 0) > 0 THEN 1 ELSE 0 END) as multi_modal_count
            FROM learners_enriched
        """
        
        overall = db.query(overall_query)
        overall_data = overall[0] if overall else {}
        
        # Get Actions level distribution by segment
        actions_dist_query = """
            WITH learning_segments AS (
                SELECT
                    CASE
                        WHEN COALESCE(exams_passed, 0) >= 1 THEN 'Certified'
                        WHEN COALESCE(skills_count, 0) > 0 THEN 'Skills Only'
                        WHEN COALESCE(learn_page_views, 0) > 0 THEN 'Learn Only'
                        ELSE 'No Learning'
                    END as segment,
                    -- Calculate approximate level from days
                    CASE 
                        WHEN COALESCE(actions_days_90d, 0) >= 18 THEN 
                            CASE WHEN COALESCE(actions_engagement_events, 0) >= 60 THEN 5 ELSE 4 END
                        WHEN COALESCE(actions_days_90d, 0) >= 10 THEN 3
                        WHEN COALESCE(actions_days_90d, 0) >= 5 THEN 2
                        WHEN COALESCE(actions_days_90d, 0) >= 1 THEN 1
                        ELSE 0
                    END as actions_level
                FROM learners_enriched
            )
            SELECT segment, actions_level, COUNT(*) as count
            FROM learning_segments
            GROUP BY segment, actions_level
            ORDER BY segment, actions_level
        """
        
        actions_dist_raw = db.query(actions_dist_query)
        
        # Transform to nested dict
        actions_distribution: Dict[str, Dict[int, int]] = {}
        for row in actions_dist_raw:
            seg = row.get("segment", "Unknown")
            level = row.get("actions_level", 0)
            count = row.get("count", 0)
            if seg not in actions_distribution:
                actions_distribution[seg] = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            actions_distribution[seg][level] = count
        
        # Get Copilot stats by learning type
        copilot_query = """
            WITH learning_segments AS (
                SELECT
                    CASE
                        WHEN COALESCE(exams_passed, 0) >= 2 THEN 'Multi-Certified'
                        WHEN COALESCE(exams_passed, 0) = 1 THEN 'Certified'
                        WHEN COALESCE(skills_count, 0) > 0 AND COALESCE(learn_page_views, 0) > 0 THEN 'Skills + Learn'
                        WHEN COALESCE(skills_count, 0) > 0 THEN 'Skills Only'
                        WHEN COALESCE(learn_page_views, 0) > 0 THEN 'Learn Only'
                        ELSE 'No Learning'
                    END as segment,
                    COALESCE(uses_copilot, false) as uses_copilot,
                    COALESCE(copilot_days_90d, 0) as copilot_days
                FROM learners_enriched
            )
            SELECT
                segment,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as adopters,
                COUNT(*) as total,
                ROUND(AVG(copilot_days), 1) as avg_days
            FROM learning_segments
            GROUP BY segment
        """
        
        copilot_raw = db.query(copilot_query)
        copilot_stats: Dict[str, Dict[str, Any]] = {}
        for row in copilot_raw:
            seg = row.get("segment", "Unknown")
            copilot_stats[seg] = {
                "adopters": row.get("adopters", 0),
                "total": row.get("total", 0),
                "avgDays": row.get("avg_days", 0.0),
            }
        
        # Format segment data for frontend
        segment_descriptions = {
            "Multi-Certified": "2+ certifications",
            "Certified": "1 certification",
            "Skills + Learn": "Both activities, no cert",
            "Skills Only": "Skills courses only",
            "Learn Only": "GitHub Learn only",
            "No Learning": "Baseline (no activities)",
        }
        
        formatted_segments = []
        for seg in segments:
            name = seg.get("segment", "Unknown")
            formatted_segments.append({
                "name": name,
                "description": segment_descriptions.get(name, ""),
                "userCount": seg.get("user_count", 0),
                "copilotAdoption": seg.get("copilot_adoption", 0.0),
                "actionsAdoption": seg.get("actions_adoption", 0.0),
                "securityAdoption": seg.get("security_adoption", 0.0),
                "avgActionsLevel": seg.get("avg_actions_level", 0.0),
                "avgCopilotDays": seg.get("avg_copilot_days", 0.0),
            })
        
        return {
            "segments": formatted_segments,
            "overall": {
                "totalLearners": overall_data.get("total_learners", 0),
                "certifiedCount": overall_data.get("certified_count", 0),
                "skillsOnlyCount": overall_data.get("skills_only_count", 0),
                "learnOnlyCount": overall_data.get("learn_only_count", 0),
                "multiModalCount": overall_data.get("multi_modal_count", 0),
            },
            "actionsDistribution": {
                "byLearningType": actions_distribution,
            },
            "copilotStats": {
                "byLearningType": copilot_stats,
            },
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting learning adoption stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/status")
async def get_database_status() -> Dict[str, Any]:
    """Get DuckDB database status and loaded tables."""
    try:
        db = get_database()
        
        table_info = []
        for table in db.tables:
            try:
                count = db.query(f"SELECT COUNT(*) as cnt FROM {table}")[0]["cnt"]
                table_info.append({"name": table, "rows": count})
            except:
                table_info.append({"name": table, "rows": -1})
        
        return {
            "available": db.is_available,
            "tables": table_info,
            "table_count": len(db.tables),
        }
        
    except Exception as e:
        logger.error(f"Error getting database status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/skills-deep-dive")
async def get_skills_deep_dive() -> Dict[str, Any]:
    """
    Deep dive analytics for Skills page - cross-category analysis,
    learning patterns, skill journeys, and user segmentation.
    """
    try:
        db = get_database()
        
        if not db.is_available:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Cross-category overlap (users with multiple skill types)
        overlap_query = """
            WITH skill_flags AS (
                SELECT
                    CASE WHEN COALESCE(ai_skills_count, 0) > 0 THEN 1 ELSE 0 END as has_ai,
                    CASE WHEN COALESCE(actions_skills_count, 0) > 0 THEN 1 ELSE 0 END as has_actions,
                    CASE WHEN COALESCE(git_skills_count, 0) > 0 THEN 1 ELSE 0 END as has_git,
                    CASE WHEN COALESCE(security_skills_count, 0) > 0 THEN 1 ELSE 0 END as has_security
                FROM learners_enriched
                WHERE COALESCE(skills_count, 0) > 0
            )
            SELECT
                SUM(has_ai) as ai_total,
                SUM(has_actions) as actions_total,
                SUM(has_git) as git_total,
                SUM(has_security) as security_total,
                SUM(CASE WHEN has_ai=1 AND has_git=1 THEN 1 ELSE 0 END) as ai_and_git,
                SUM(CASE WHEN has_ai=1 AND has_actions=1 THEN 1 ELSE 0 END) as ai_and_actions,
                SUM(CASE WHEN has_ai=1 AND has_security=1 THEN 1 ELSE 0 END) as ai_and_security,
                SUM(CASE WHEN has_git=1 AND has_actions=1 THEN 1 ELSE 0 END) as git_and_actions,
                SUM(CASE WHEN has_git=1 AND has_security=1 THEN 1 ELSE 0 END) as git_and_security,
                SUM(CASE WHEN has_actions=1 AND has_security=1 THEN 1 ELSE 0 END) as actions_and_security,
                SUM(CASE WHEN has_ai + has_actions + has_git + has_security >= 3 THEN 1 ELSE 0 END) as multi_category,
                SUM(CASE WHEN has_ai + has_actions + has_git + has_security = 4 THEN 1 ELSE 0 END) as all_categories
            FROM skill_flags
        """
        overlap_raw = db.query(overlap_query)
        overlap_data = overlap_raw[0] if overlap_raw else {}
        
        # Skills depth distribution
        depth_query = """
            SELECT
                CASE
                    WHEN COALESCE(skills_count, 0) >= 10 THEN 'Power User (10+)'
                    WHEN COALESCE(skills_count, 0) >= 5 THEN 'Active Learner (5-9)'
                    WHEN COALESCE(skills_count, 0) >= 3 THEN 'Engaged (3-4)'
                    WHEN COALESCE(skills_count, 0) >= 1 THEN 'Getting Started (1-2)'
                    ELSE 'None'
                END as depth_level,
                CASE
                    WHEN COALESCE(skills_count, 0) >= 10 THEN 1
                    WHEN COALESCE(skills_count, 0) >= 5 THEN 2
                    WHEN COALESCE(skills_count, 0) >= 3 THEN 3
                    WHEN COALESCE(skills_count, 0) >= 1 THEN 4
                    ELSE 5
                END as sort_order,
                COUNT(*) as users,
                ROUND(AVG(COALESCE(skills_count, 0)), 1) as avg_skills,
                ROUND(AVG(CASE WHEN COALESCE(uses_copilot, false) THEN 100.0 ELSE 0 END), 1) as copilot_rate,
                ROUND(AVG(CASE WHEN COALESCE(uses_actions, false) THEN 100.0 ELSE 0 END), 1) as actions_rate,
                ROUND(AVG(COALESCE(skill_maturity_score, 0)), 1) as avg_maturity
            FROM learners_enriched
            GROUP BY 1, 2
            ORDER BY sort_order
        """
        depth_raw = db.query(depth_query)
        
        # Skills engagement heatmap (skills vs page views)
        heatmap_query = """
            WITH engagement_matrix AS (
                SELECT
                    CASE
                        WHEN COALESCE(skills_count, 0) = 0 THEN '0 Skills'
                        WHEN COALESCE(skills_count, 0) <= 2 THEN '1-2 Skills'
                        WHEN COALESCE(skills_count, 0) <= 5 THEN '3-5 Skills'
                        ELSE '6+ Skills'
                    END as skills_bucket,
                    CASE
                        WHEN COALESCE(skills_page_views, 0) = 0 THEN 'No Views'
                        WHEN COALESCE(skills_page_views, 0) <= 5 THEN '1-5 Views'
                        WHEN COALESCE(skills_page_views, 0) <= 15 THEN '6-15 Views'
                        ELSE '16+ Views'
                    END as views_bucket,
                    COALESCE(uses_copilot, false) as uses_copilot
                FROM learners_enriched
            )
            SELECT
                skills_bucket,
                views_bucket,
                COUNT(*) as users,
                ROUND(AVG(CASE WHEN uses_copilot THEN 100.0 ELSE 0 END), 1) as copilot_rate
            FROM engagement_matrix
            GROUP BY skills_bucket, views_bucket
            ORDER BY 
                CASE skills_bucket
                    WHEN '0 Skills' THEN 1
                    WHEN '1-2 Skills' THEN 2
                    WHEN '3-5 Skills' THEN 3
                    ELSE 4
                END,
                CASE views_bucket
                    WHEN 'No Views' THEN 1
                    WHEN '1-5 Views' THEN 2
                    WHEN '6-15 Views' THEN 3
                    ELSE 4
                END
        """
        heatmap_raw = db.query(heatmap_query)
        
        # Skills path analysis - what categories do users start with?
        path_query = """
            WITH skill_users AS (
                SELECT
                    COALESCE(ai_skills_count, 0) as ai,
                    COALESCE(git_skills_count, 0) as git,
                    COALESCE(actions_skills_count, 0) as actions,
                    COALESCE(security_skills_count, 0) as security,
                    COALESCE(skills_count, 0) as total
                FROM learners_enriched
                WHERE COALESCE(skills_count, 0) > 0
            )
            SELECT
                CASE 
                    WHEN ai > 0 AND git = 0 AND actions = 0 AND security = 0 THEN 'AI Only'
                    WHEN git > 0 AND ai = 0 AND actions = 0 AND security = 0 THEN 'Git Only'
                    WHEN actions > 0 AND ai = 0 AND git = 0 AND security = 0 THEN 'Actions Only'
                    WHEN security > 0 AND ai = 0 AND git = 0 AND actions = 0 THEN 'Security Only'
                    WHEN ai > 0 AND git > 0 AND actions = 0 AND security = 0 THEN 'AI + Git'
                    WHEN ai > 0 AND actions > 0 THEN 'AI + Actions'
                    WHEN git > 0 AND actions > 0 THEN 'Git + Actions'
                    ELSE 'Multi-Category'
                END as path_type,
                COUNT(*) as users,
                ROUND(AVG(total), 1) as avg_skills
            FROM skill_users
            GROUP BY 1
            ORDER BY users DESC
        """
        path_raw = db.query(path_query)
        
        # Skills + Learn synergy
        synergy_query = """
            SELECT
                CASE
                    WHEN COALESCE(skills_count, 0) > 0 AND COALESCE(learn_page_views, 0) > 0 THEN 'Skills + Learn'
                    WHEN COALESCE(skills_count, 0) > 0 THEN 'Skills Only'
                    WHEN COALESCE(learn_page_views, 0) > 0 THEN 'Learn Only'
                    ELSE 'Neither'
                END as learning_type,
                COUNT(*) as users,
                ROUND(AVG(CASE WHEN COALESCE(uses_copilot, false) THEN 100.0 ELSE 0 END), 1) as copilot_rate,
                ROUND(AVG(CASE WHEN COALESCE(uses_actions, false) THEN 100.0 ELSE 0 END), 1) as actions_rate,
                ROUND(AVG(COALESCE(skill_maturity_score, 0)), 1) as avg_maturity,
                ROUND(AVG(COALESCE(copilot_days_90d, 0)), 1) as avg_copilot_days
            FROM learners_enriched
            GROUP BY 1
            ORDER BY copilot_rate DESC
        """
        synergy_raw = db.query(synergy_query)
        
        # Top skill combinations
        combo_query = """
            SELECT
                CASE
                    WHEN COALESCE(ai_skills_count, 0) > 0 THEN 'AI' ELSE '' END ||
                    CASE WHEN COALESCE(ai_skills_count, 0) > 0 AND 
                        (COALESCE(git_skills_count, 0) > 0 OR COALESCE(actions_skills_count, 0) > 0 OR COALESCE(security_skills_count, 0) > 0) 
                        THEN ' + ' ELSE '' END ||
                    CASE WHEN COALESCE(git_skills_count, 0) > 0 THEN 'Git' ELSE '' END ||
                    CASE WHEN COALESCE(git_skills_count, 0) > 0 AND 
                        (COALESCE(actions_skills_count, 0) > 0 OR COALESCE(security_skills_count, 0) > 0) 
                        THEN ' + ' ELSE '' END ||
                    CASE WHEN COALESCE(actions_skills_count, 0) > 0 THEN 'Actions' ELSE '' END ||
                    CASE WHEN COALESCE(actions_skills_count, 0) > 0 AND COALESCE(security_skills_count, 0) > 0 
                        THEN ' + ' ELSE '' END ||
                    CASE WHEN COALESCE(security_skills_count, 0) > 0 THEN 'Security' ELSE '' END
                as combination,
                COUNT(*) as users,
                ROUND(AVG(CASE WHEN COALESCE(uses_copilot, false) THEN 100.0 ELSE 0 END), 1) as copilot_rate
            FROM learners_enriched
            WHERE COALESCE(skills_count, 0) > 0
            GROUP BY 1
            HAVING COUNT(*) >= 50
            ORDER BY users DESC
            LIMIT 10
        """
        combo_raw = db.query(combo_query)
        
        # Format response
        return {
            "categoryOverlap": {
                "aiTotal": int(overlap_data.get("ai_total") or 0),
                "actionsTotal": int(overlap_data.get("actions_total") or 0),
                "gitTotal": int(overlap_data.get("git_total") or 0),
                "securityTotal": int(overlap_data.get("security_total") or 0),
                "aiAndGit": int(overlap_data.get("ai_and_git") or 0),
                "aiAndActions": int(overlap_data.get("ai_and_actions") or 0),
                "aiAndSecurity": int(overlap_data.get("ai_and_security") or 0),
                "gitAndActions": int(overlap_data.get("git_and_actions") or 0),
                "gitAndSecurity": int(overlap_data.get("git_and_security") or 0),
                "actionsAndSecurity": int(overlap_data.get("actions_and_security") or 0),
                "multiCategory": int(overlap_data.get("multi_category") or 0),
                "allCategories": int(overlap_data.get("all_categories") or 0),
            },
            "depthDistribution": [
                {
                    "level": row.get("depth_level"),
                    "users": int(row.get("users") or 0),
                    "avgSkills": float(row.get("avg_skills") or 0),
                    "copilotRate": float(row.get("copilot_rate") or 0),
                    "actionsRate": float(row.get("actions_rate") or 0),
                    "avgMaturity": float(row.get("avg_maturity") or 0),
                }
                for row in depth_raw
            ],
            "engagementHeatmap": [
                {
                    "skillsBucket": row.get("skills_bucket"),
                    "viewsBucket": row.get("views_bucket"),
                    "users": int(row.get("users") or 0),
                    "copilotRate": float(row.get("copilot_rate") or 0),
                }
                for row in heatmap_raw
            ],
            "learningPaths": [
                {
                    "pathType": row.get("path_type"),
                    "users": int(row.get("users") or 0),
                    "avgSkills": float(row.get("avg_skills") or 0),
                }
                for row in path_raw
            ],
            "learningSynergy": [
                {
                    "type": row.get("learning_type"),
                    "users": int(row.get("users") or 0),
                    "copilotRate": float(row.get("copilot_rate") or 0),
                    "actionsRate": float(row.get("actions_rate") or 0),
                    "avgMaturity": float(row.get("avg_maturity") or 0),
                    "avgCopilotDays": float(row.get("avg_copilot_days") or 0),
                }
                for row in synergy_raw
            ],
            "topCombinations": [
                {
                    "combination": row.get("combination"),
                    "users": int(row.get("users") or 0),
                    "copilotRate": float(row.get("copilot_rate") or 0),
                }
                for row in combo_raw
            ],
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting skills deep dive: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/database/reload")
@limiter.limit("2/minute")  # Prevent DoS via expensive reloads
async def reload_database(request: Request) -> Dict[str, str]:
    """Reload database from disk (after running sync script)."""
    try:
        db = get_database()
        db.reload()
        
        return {
            "status": "success",
            "message": f"Reloaded {len(db.tables)} tables",
            "tables": db.tables,
        }
        
    except Exception as e:
        logger.error(f"Error reloading database: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/github-activity")
async def get_github_activity_stats() -> Dict[str, Any]:
    """
    Get comprehensive GitHub activity statistics from enriched learner data.
    
    This pulls from the full 367K+ learner dataset with all activity metrics.
    
    Returns:
        - totalUsers: Total learners in dataset
        - totalUsersWithActivity: Users with any GitHub activity
        - totals: Aggregate counts for all products
        - averages: Per-user averages
        - productUsage: Usage stats for each product (Copilot, Actions, etc.)
        - byCertStatus: Activity comparison certified vs non-certified
        - byStatus: Activity by learner status
        - topContributors: Top learners by activity
    """
    try:
        db = get_database()
        
        # Get comprehensive activity metrics
        result = db.query("""
            SELECT 
                -- Total counts
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE COALESCE(total_active_days, 0) > 0) as users_with_activity,
                COUNT(*) FILTER (WHERE COALESCE(pr_days, 0) > 0) as users_with_prs,
                COUNT(*) FILTER (WHERE COALESCE(issues_days, 0) > 0) as users_with_issues,
                COUNT(*) FILTER (WHERE COALESCE(copilot_days, 0) > 0) as users_with_copilot,
                COUNT(*) FILTER (WHERE COALESCE(actions_days, 0) > 0) as users_with_actions,
                COUNT(*) FILTER (WHERE COALESCE(security_days, 0) > 0) as users_with_security,
                COUNT(*) FILTER (WHERE COALESCE(code_search_days, 0) > 0) as users_with_code_search,
                COUNT(*) FILTER (WHERE COALESCE(discussions_days, 0) > 0) as users_with_discussions,
                COUNT(*) FILTER (WHERE COALESCE(projects_days, 0) > 0) as users_with_projects,
                COUNT(*) FILTER (WHERE COALESCE(packages_days, 0) > 0) as users_with_packages,
                
                -- Total days
                COALESCE(SUM(total_active_days), 0) as total_active_days,
                COALESCE(SUM(total_active_days_90d), 0) as total_active_days_90d,
                COALESCE(SUM(pr_days), 0) as total_pr_days,
                COALESCE(SUM(issues_days), 0) as total_issues_days,
                COALESCE(SUM(copilot_days), 0) as total_copilot_days,
                COALESCE(SUM(copilot_days_90d), 0) as total_copilot_days_90d,
                COALESCE(SUM(actions_days), 0) as total_actions_days,
                COALESCE(SUM(actions_days_90d), 0) as total_actions_days_90d,
                COALESCE(SUM(security_days), 0) as total_security_days,
                COALESCE(SUM(code_search_days), 0) as total_code_search_days,
                COALESCE(SUM(discussions_days), 0) as total_discussions_days,
                COALESCE(SUM(projects_days), 0) as total_projects_days,
                COALESCE(SUM(packages_days), 0) as total_packages_days,
                COALESCE(SUM(pages_days), 0) as total_pages_days,
                
                -- Engagement events
                COALESCE(SUM(total_engagement_events), 0) as total_engagement_events,
                COALESCE(SUM(copilot_engagement_events), 0) as copilot_engagement_events,
                COALESCE(SUM(actions_engagement_events), 0) as actions_engagement_events,
                
                -- Averages (for users with any activity)
                ROUND(AVG(CASE WHEN total_active_days > 0 THEN total_active_days ELSE NULL END), 1) as avg_active_days,
                ROUND(AVG(CASE WHEN total_active_days_90d > 0 THEN total_active_days_90d ELSE NULL END), 1) as avg_active_days_90d,
                ROUND(AVG(CASE WHEN pr_days > 0 THEN pr_days ELSE NULL END), 1) as avg_pr_days,
                ROUND(AVG(CASE WHEN issues_days > 0 THEN issues_days ELSE NULL END), 1) as avg_issues_days,
                ROUND(AVG(CASE WHEN copilot_days > 0 THEN copilot_days ELSE NULL END), 1) as avg_copilot_days,
                ROUND(AVG(CASE WHEN actions_days > 0 THEN actions_days ELSE NULL END), 1) as avg_actions_days,
                
                -- Certified vs Non-certified comparison
                ROUND(AVG(CASE WHEN exams_passed > 0 THEN total_active_days_90d ELSE NULL END), 1) as certified_avg_active_days_90d,
                ROUND(AVG(CASE WHEN exams_passed = 0 OR exams_passed IS NULL THEN total_active_days_90d ELSE NULL END), 1) as learning_avg_active_days_90d,
                ROUND(AVG(CASE WHEN exams_passed > 0 THEN pr_days ELSE NULL END), 1) as certified_avg_pr_days,
                ROUND(AVG(CASE WHEN exams_passed = 0 OR exams_passed IS NULL THEN pr_days ELSE NULL END), 1) as learning_avg_pr_days,
                ROUND(AVG(CASE WHEN exams_passed > 0 THEN copilot_days ELSE NULL END), 1) as certified_avg_copilot_days,
                ROUND(AVG(CASE WHEN exams_passed = 0 OR exams_passed IS NULL THEN copilot_days ELSE NULL END), 1) as learning_avg_copilot_days,
                
                -- Count by cert status
                COUNT(*) FILTER (WHERE exams_passed > 0) as certified_count,
                COUNT(*) FILTER (WHERE exams_passed = 0 OR exams_passed IS NULL) as learning_count
                
            FROM learners_enriched
        """)
        
        # Activity by learner status
        status_result = db.query("""
            SELECT 
                learner_status,
                COUNT(*) as count,
                ROUND(AVG(COALESCE(total_active_days_90d, 0)), 1) as avg_active_days_90d,
                ROUND(AVG(COALESCE(pr_days, 0)), 1) as avg_pr_days,
                ROUND(AVG(COALESCE(issues_days, 0)), 1) as avg_issues_days,
                ROUND(AVG(COALESCE(copilot_days, 0)), 1) as avg_copilot_days,
                ROUND(AVG(COALESCE(actions_days, 0)), 1) as avg_actions_days,
                SUM(CASE WHEN total_active_days > 0 THEN 1 ELSE 0 END) as with_activity
            FROM learners_enriched
            WHERE learner_status IS NOT NULL
            GROUP BY learner_status
            ORDER BY count DESC
        """)
        
        # Top contributors by total active days
        top_contributors = db.query("""
            SELECT 
                COALESCE(userhandle, email, 'unknown') as handle,
                learner_status,
                exams_passed,
                total_active_days,
                total_active_days_90d,
                pr_days,
                issues_days,
                copilot_days,
                actions_days,
                total_engagement_events
            FROM learners_enriched
            WHERE total_active_days > 0
            ORDER BY total_active_days DESC
            LIMIT 25
        """)
        
        if result:
            row = result[0]
            return {
                "totalUsers": int(row.get("total_users", 0) or 0),
                "totalUsersWithActivity": int(row.get("users_with_activity", 0) or 0),
                "usersWithPRs": int(row.get("users_with_prs", 0) or 0),
                "usersWithIssues": int(row.get("users_with_issues", 0) or 0),
                "usersWithCopilot": int(row.get("users_with_copilot", 0) or 0),
                "usersWithActions": int(row.get("users_with_actions", 0) or 0),
                "usersWithSecurity": int(row.get("users_with_security", 0) or 0),
                "totals": {
                    "activeDays": int(row.get("total_active_days", 0) or 0),
                    "activeDays90d": int(row.get("total_active_days_90d", 0) or 0),
                    "prDays": int(row.get("total_pr_days", 0) or 0),
                    "issuesDays": int(row.get("total_issues_days", 0) or 0),
                    "copilotDays": int(row.get("total_copilot_days", 0) or 0),
                    "copilotDays90d": int(row.get("total_copilot_days_90d", 0) or 0),
                    "actionsDays": int(row.get("total_actions_days", 0) or 0),
                    "actionsDays90d": int(row.get("total_actions_days_90d", 0) or 0),
                    "securityDays": int(row.get("total_security_days", 0) or 0),
                    "codeSearchDays": int(row.get("total_code_search_days", 0) or 0),
                    "discussionsDays": int(row.get("total_discussions_days", 0) or 0),
                    "projectsDays": int(row.get("total_projects_days", 0) or 0),
                    "packagesDays": int(row.get("total_packages_days", 0) or 0),
                    "pagesDays": int(row.get("total_pages_days", 0) or 0),
                    "engagementEvents": int(row.get("total_engagement_events", 0) or 0),
                    "copilotEvents": int(row.get("copilot_engagement_events", 0) or 0),
                    "actionsEvents": int(row.get("actions_engagement_events", 0) or 0),
                },
                "averages": {
                    "activeDays": float(row.get("avg_active_days", 0) or 0),
                    "activeDays90d": float(row.get("avg_active_days_90d", 0) or 0),
                    "prDays": float(row.get("avg_pr_days", 0) or 0),
                    "issuesDays": float(row.get("avg_issues_days", 0) or 0),
                    "copilotDays": float(row.get("avg_copilot_days", 0) or 0),
                    "actionsDays": float(row.get("avg_actions_days", 0) or 0),
                },
                "productUsage": {
                    "copilot": {
                        "users": int(row.get("users_with_copilot", 0) or 0),
                        "totalDays": int(row.get("total_copilot_days", 0) or 0),
                        "totalDays90d": int(row.get("total_copilot_days_90d", 0) or 0),
                        "events": int(row.get("copilot_engagement_events", 0) or 0),
                    },
                    "actions": {
                        "users": int(row.get("users_with_actions", 0) or 0),
                        "totalDays": int(row.get("total_actions_days", 0) or 0),
                        "totalDays90d": int(row.get("total_actions_days_90d", 0) or 0),
                        "events": int(row.get("actions_engagement_events", 0) or 0),
                    },
                    "security": {
                        "users": int(row.get("users_with_security", 0) or 0),
                        "totalDays": int(row.get("total_security_days", 0) or 0),
                    },
                    "codeSearch": {
                        "users": int(row.get("users_with_code_search", 0) or 0),
                        "totalDays": int(row.get("total_code_search_days", 0) or 0),
                    },
                    "discussions": {
                        "users": int(row.get("users_with_discussions", 0) or 0),
                        "totalDays": int(row.get("total_discussions_days", 0) or 0),
                    },
                    "projects": {
                        "users": int(row.get("users_with_projects", 0) or 0),
                        "totalDays": int(row.get("total_projects_days", 0) or 0),
                    },
                    "packages": {
                        "users": int(row.get("users_with_packages", 0) or 0),
                        "totalDays": int(row.get("total_packages_days", 0) or 0),
                    },
                    "pullRequests": {
                        "users": int(row.get("users_with_prs", 0) or 0),
                        "totalDays": int(row.get("total_pr_days", 0) or 0),
                    },
                    "issues": {
                        "users": int(row.get("users_with_issues", 0) or 0),
                        "totalDays": int(row.get("total_issues_days", 0) or 0),
                    },
                },
                "byCertStatus": {
                    "certified": {
                        "count": int(row.get("certified_count", 0) or 0),
                        "avgActiveDays90d": float(row.get("certified_avg_active_days_90d", 0) or 0),
                        "avgPrDays": float(row.get("certified_avg_pr_days", 0) or 0),
                        "avgCopilotDays": float(row.get("certified_avg_copilot_days", 0) or 0),
                    },
                    "learning": {
                        "count": int(row.get("learning_count", 0) or 0),
                        "avgActiveDays90d": float(row.get("learning_avg_active_days_90d", 0) or 0),
                        "avgPrDays": float(row.get("learning_avg_pr_days", 0) or 0),
                        "avgCopilotDays": float(row.get("learning_avg_copilot_days", 0) or 0),
                    },
                },
                "byStatus": [
                    {
                        "status": r.get("learner_status"),
                        "count": int(r.get("count", 0) or 0),
                        "avgActiveDays90d": float(r.get("avg_active_days_90d", 0) or 0),
                        "avgPrDays": float(r.get("avg_pr_days", 0) or 0),
                        "avgIssuesDays": float(r.get("avg_issues_days", 0) or 0),
                        "avgCopilotDays": float(r.get("avg_copilot_days", 0) or 0),
                        "avgActionsDays": float(r.get("avg_actions_days", 0) or 0),
                        "withActivity": int(r.get("with_activity", 0) or 0),
                    }
                    for r in (status_result or [])
                ],
                "topContributors": [
                    {
                        "handle": r.get("handle"),
                        "status": r.get("learner_status"),
                        "certifications": int(r.get("exams_passed", 0) or 0),
                        "totalActiveDays": int(r.get("total_active_days", 0) or 0),
                        "activeDays90d": int(r.get("total_active_days_90d", 0) or 0),
                        "prDays": int(r.get("pr_days", 0) or 0),
                        "issuesDays": int(r.get("issues_days", 0) or 0),
                        "copilotDays": int(r.get("copilot_days", 0) or 0),
                        "actionsDays": int(r.get("actions_days", 0) or 0),
                        "engagementEvents": int(r.get("total_engagement_events", 0) or 0),
                    }
                    for r in (top_contributors or [])
                ],
                "source": "enriched_parquet"
            }
        
        return {"totalUsersWithActivity": 0, "source": "enriched_parquet"}
        
    except Exception as e:
        logger.error(f"Error getting GitHub activity stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/status")
async def get_sync_status() -> Dict[str, Any]:
    """
    Get status of the last data sync.
    
    Returns:
        - last_sync: Timestamp of last successful sync
        - sync_duration_seconds: How long the sync took
        - records_synced: Number of records synced
        - data_file_age_hours: Age of the data file in hours
        - next_sync_scheduled: When next sync is scheduled (if cron is set up)
    """
    try:
        settings = get_settings()
        data_dir = settings.data_path
        
        # Check for sync status file (created by sync script)
        sync_status_file = data_dir / "sync_status.json"
        sync_status = {}
        
        if sync_status_file.exists():
            with open(sync_status_file) as f:
                sync_status = json.load(f)
        
        # Check parquet file age
        parquet_file = data_dir / "learners_enriched.parquet"
        parquet_age_hours = None
        parquet_size_mb = None
        
        if parquet_file.exists():
            file_stat = parquet_file.stat()
            file_mtime = datetime.fromtimestamp(file_stat.st_mtime)
            parquet_age_hours = round((datetime.now() - file_mtime).total_seconds() / 3600, 1)
            parquet_size_mb = round(file_stat.st_size / (1024 * 1024), 1)
        
        # Check if cron job is set up
        cron_status = "unknown"
        try:
            import subprocess
            result = subprocess.run(
                ["crontab", "-l"], 
                capture_output=True, 
                text=True
            )
            if "sync-enriched-learners" in result.stdout or "run-sync.sh" in result.stdout:
                cron_status = "active"
            else:
                cron_status = "not_configured"
        except:
            cron_status = "unknown"
        
        return {
            "last_sync": sync_status.get("last_sync"),
            "sync_duration_seconds": sync_status.get("sync_duration_seconds"),
            "records_synced": sync_status.get("records_synced"),
            "data_file_age_hours": parquet_age_hours,
            "data_file_size_mb": parquet_size_mb,
            "cron_status": cron_status,
            "data_file_exists": parquet_file.exists(),
        }
        
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
