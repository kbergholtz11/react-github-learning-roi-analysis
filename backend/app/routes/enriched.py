"""
Enriched Learners API routes - Uses DuckDB for fast queries.

Provides endpoints for querying enriched learner data with full
company/demographics/product usage information.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.database import get_database, LearnerQueries
from app.config import get_settings

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


@router.get("/companies/top")
async def get_top_companies(
    limit: int = Query(20, ge=1, le=100, description="Number of companies")
) -> List[Dict[str, Any]]:
    """
    Get top companies by learner count.
    
    Returns company stats including:
    - learner_count
    - certified_count
    - total_certs
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


@router.post("/database/reload")
async def reload_database() -> Dict[str, str]:
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
