"""
Health and Data Freshness API Routes

Provides endpoints for monitoring data health, freshness, and quality.
Essential for operational visibility into the Learning ROI application.

Endpoints:
    GET /health - Basic health check
    GET /health/data - Data freshness and quality summary
    GET /health/detailed - Detailed health with all checks
    GET /api/data-freshness - Data freshness for frontend display
    GET /api/data-quality - Data quality report summary
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Data paths
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
LEARNERS_FILE = DATA_DIR / "learners_enriched.parquet"
SYNC_STATUS_FILE = DATA_DIR / "sync_status.json"
QUALITY_REPORT_FILE = DATA_DIR / "quality_report.json"
AGGREGATED_DIR = DATA_DIR / "aggregated"

router = APIRouter()


class HealthStatus(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    version: str = "1.0.0"


class DataFreshness(BaseModel):
    """Data freshness response model."""
    data_file_exists: bool
    last_modified: Optional[str]
    hours_since_update: Optional[float]
    is_fresh: bool
    freshness_threshold_hours: int = 24
    record_count: Optional[int]
    sync_status: Optional[Dict[str, Any]]


class DataQuality(BaseModel):
    """Data quality summary model."""
    timestamp: Optional[str]
    total_checks: int
    passed: int
    failed: int
    errors: int
    warnings: int
    overall_status: str


class DetailedHealth(BaseModel):
    """Detailed health check response."""
    status: str
    timestamp: str
    data_freshness: DataFreshness
    data_quality: Optional[DataQuality]
    aggregated_files: Dict[str, bool]
    cache_status: Dict[str, Any]


def get_file_freshness(file_path: Path, threshold_hours: int = 24) -> Dict[str, Any]:
    """Check freshness of a file."""
    if not file_path.exists():
        return {
            "exists": False,
            "modified": None,
            "hours_old": None,
            "is_fresh": False,
        }
    
    mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
    hours_old = (datetime.now() - mtime).total_seconds() / 3600
    
    return {
        "exists": True,
        "modified": mtime.isoformat(),
        "hours_old": round(hours_old, 2),
        "is_fresh": hours_old <= threshold_hours,
    }


def load_sync_status() -> Optional[Dict[str, Any]]:
    """Load sync status from file."""
    if not SYNC_STATUS_FILE.exists():
        return None
    try:
        with open(SYNC_STATUS_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def load_quality_report() -> Optional[Dict[str, Any]]:
    """Load quality report from file."""
    if not QUALITY_REPORT_FILE.exists():
        return None
    try:
        with open(QUALITY_REPORT_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def get_record_count() -> Optional[int]:
    """Get record count from learners file."""
    if not LEARNERS_FILE.exists():
        return None
    try:
        import pandas as pd
        df = pd.read_parquet(LEARNERS_FILE, columns=["dotcom_id"])
        return len(df)
    except Exception:
        return None


@router.get("/health", response_model=HealthStatus, tags=["Health"])
async def health_check():
    """
    Basic health check endpoint.
    
    Returns a simple status to confirm the API is running.
    Use /health/data for data-specific health checks.
    """
    return HealthStatus(
        status="healthy",
        timestamp=datetime.now().isoformat(),
    )


@router.get("/health/data", tags=["Health"])
async def data_health_check():
    """
    Data freshness and quality health check.
    
    Returns information about:
    - Data file existence and freshness
    - Sync status
    - Quality report summary
    - Overall data health status
    """
    # Check data file freshness
    file_freshness = get_file_freshness(LEARNERS_FILE, threshold_hours=24)
    
    # Load sync status
    sync_status = load_sync_status()
    
    # Load quality report
    quality_report = load_quality_report()
    
    # Get record count
    record_count = None
    if file_freshness["exists"]:
        record_count = get_record_count()
    
    # Determine overall status
    status = "healthy"
    issues = []
    
    if not file_freshness["exists"]:
        status = "unhealthy"
        issues.append("Data file does not exist")
    elif not file_freshness["is_fresh"]:
        status = "degraded"
        issues.append(f"Data is {file_freshness['hours_old']:.1f} hours old")
    
    if quality_report:
        summary = quality_report.get("summary", {})
        if summary.get("errors", 0) > 0:
            status = "degraded"
            issues.append(f"{summary['errors']} quality errors")
    
    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "data_freshness": {
            "file_exists": file_freshness["exists"],
            "last_modified": file_freshness["modified"],
            "hours_since_update": file_freshness["hours_old"],
            "is_fresh": file_freshness["is_fresh"],
            "freshness_threshold_hours": 24,
            "record_count": record_count,
        },
        "sync_status": sync_status,
        "quality_summary": quality_report.get("summary") if quality_report else None,
        "issues": issues,
    }


@router.get("/health/detailed", tags=["Health"])
async def detailed_health_check():
    """
    Detailed health check with all components.
    
    Includes:
    - Data file status
    - All aggregated files status
    - Cache status
    - Quality report details
    - Sync history
    """
    # Check main data file
    learners_freshness = get_file_freshness(LEARNERS_FILE)
    
    # Check aggregated files
    aggregated_files = {}
    if AGGREGATED_DIR.exists():
        expected_files = [
            "metrics.json",
            "impact.json",
            "journey.json",
            "summary.json",
            "skills-learning.json",
            "top-learners.json",
        ]
        for filename in expected_files:
            file_path = AGGREGATED_DIR / filename
            aggregated_files[filename] = file_path.exists()
    
    # Load quality report
    quality_report = load_quality_report()
    quality_summary = None
    if quality_report:
        summary = quality_report.get("summary", {})
        quality_summary = DataQuality(
            timestamp=quality_report.get("timestamp"),
            total_checks=summary.get("total_checks", 0),
            passed=summary.get("passed", 0),
            failed=summary.get("failed", 0),
            errors=summary.get("errors", 0),
            warnings=summary.get("warnings", 0),
            overall_status="healthy" if summary.get("errors", 0) == 0 else "degraded",
        )
    
    # Check cache status
    cache_status = {"available": False}
    try:
        from app.munger_cache import learner_cache
        freshness = learner_cache.get_data_freshness()
        cache_status = {
            "available": True,
            "last_refresh": freshness.get("cache_last_refresh"),
            "record_count": freshness.get("record_count"),
        }
    except Exception as e:
        cache_status["error"] = str(e)
    
    # Determine overall status
    status = "healthy"
    if not learners_freshness["exists"]:
        status = "unhealthy"
    elif not learners_freshness["is_fresh"]:
        status = "degraded"
    elif quality_summary and quality_summary.errors > 0:
        status = "degraded"
    
    return {
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "data_freshness": {
            "file_exists": learners_freshness["exists"],
            "last_modified": learners_freshness["modified"],
            "hours_since_update": learners_freshness["hours_old"],
            "is_fresh": learners_freshness["is_fresh"],
        },
        "data_quality": quality_summary.dict() if quality_summary else None,
        "aggregated_files": aggregated_files,
        "cache_status": cache_status,
        "sync_status": load_sync_status(),
    }


@router.get("/api/data-freshness", tags=["Data"])
async def get_data_freshness():
    """
    Get data freshness information for frontend display.
    
    Returns user-friendly freshness information suitable
    for displaying in dashboard headers or footers.
    """
    file_freshness = get_file_freshness(LEARNERS_FILE)
    sync_status = load_sync_status()
    
    # Parse last sync time
    last_sync = None
    if sync_status:
        # Try to find most recent sync timestamp
        for source, info in sync_status.items():
            if isinstance(info, dict) and "last_sync" in info:
                ts = info["last_sync"]
                if last_sync is None or ts > last_sync:
                    last_sync = ts
    
    # Calculate freshness message
    if file_freshness["hours_old"] is not None:
        hours = file_freshness["hours_old"]
        if hours < 1:
            freshness_message = "Updated less than an hour ago"
        elif hours < 24:
            freshness_message = f"Updated {int(hours)} hours ago"
        else:
            days = int(hours / 24)
            freshness_message = f"Updated {days} day{'s' if days > 1 else ''} ago"
    else:
        freshness_message = "Data not available"
    
    return {
        "is_fresh": file_freshness["is_fresh"],
        "last_modified": file_freshness["modified"],
        "last_sync": last_sync,
        "hours_since_update": file_freshness["hours_old"],
        "freshness_message": freshness_message,
        "record_count": get_record_count() if file_freshness["exists"] else None,
    }


@router.get("/api/data-quality", tags=["Data"])
async def get_data_quality():
    """
    Get data quality report summary.
    
    Returns the latest data quality validation results
    for display in admin dashboards.
    """
    quality_report = load_quality_report()
    
    if not quality_report:
        return {
            "available": False,
            "message": "No quality report available. Run validate-data-quality.py to generate.",
        }
    
    summary = quality_report.get("summary", {})
    
    # Get failed checks
    failed_checks = [
        check for check in quality_report.get("checks", [])
        if not check.get("passed", True)
    ]
    
    return {
        "available": True,
        "timestamp": quality_report.get("timestamp"),
        "summary": summary,
        "by_category": quality_report.get("by_category", {}),
        "failed_checks": failed_checks,
        "overall_status": "healthy" if summary.get("errors", 0) == 0 else "needs_attention",
    }


@router.get("/api/sync-status", tags=["Data"])
async def get_sync_status():
    """
    Get detailed sync status for all data sources.
    
    Shows when each data source was last synced and any errors.
    """
    sync_status = load_sync_status()
    
    if not sync_status:
        return {
            "available": False,
            "message": "No sync status available. Run sync-enriched-learners.py to sync data.",
        }
    
    return {
        "available": True,
        "sources": sync_status,
    }
