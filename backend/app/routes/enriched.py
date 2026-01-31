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
        - total: Total matching records
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
        
        learners = LearnerQueries.get_learners(
            search=search,
            status=status,
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
