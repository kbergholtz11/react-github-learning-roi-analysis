"""Custom Kusto query endpoint for advanced analytics."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.kusto import get_kusto_service
from app.models import KustoQueryRequest, KustoQueryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/query", tags=["query"])

# Allowed table names (whitelist for security)
ALLOWED_TABLES = {
    "CertifiedUsers",
    "UnifiedUsers", 
    "JourneyUsers",
    "ProductUsage",
    "LearningActivity",
}

# Dangerous keywords to block
BLOCKED_KEYWORDS = {
    "drop",
    "delete", 
    "truncate",
    "alter",
    "create",
    ".set",
    ".append",
    ".ingest",
}


def validate_query(query: str) -> tuple[bool, str]:
    """
    Validate a Kusto query for safety.
    
    Returns (is_valid, error_message).
    """
    query_lower = query.lower()
    
    # Check for blocked keywords
    for keyword in BLOCKED_KEYWORDS:
        if keyword in query_lower:
            return False, f"Query contains blocked keyword: {keyword}"
    
    # Check that query starts with a table name or let statement
    valid_starts = list(ALLOWED_TABLES) + ["let ", "//"]
    if not any(query.strip().startswith(s) for s in valid_starts):
        return False, f"Query must start with an allowed table: {', '.join(ALLOWED_TABLES)}"
    
    return True, ""


@router.post("", response_model=KustoQueryResponse)
async def execute_query(request: KustoQueryRequest):
    """
    Execute a custom Kusto query.
    
    This endpoint allows advanced analytics queries against the data.
    Queries are validated for safety before execution.
    
    Example queries:
    - `CertifiedUsers | summarize count() by learner_status`
    - `CertifiedUsers | where total_certs > 3 | project email, total_certs`
    """
    kusto = get_kusto_service()
    
    if not kusto.is_available:
        raise HTTPException(
            status_code=503,
            detail="Kusto is not configured. Custom queries require a Kusto connection."
        )
    
    # Validate query
    is_valid, error = validate_query(request.query)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    try:
        start_time = datetime.now()
        
        rows = kusto.execute_query(
            request.query,
            parameters=request.parameters,
            use_cache=True,
        )
        
        elapsed_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # Extract column names from first row
        columns = list(rows[0].keys()) if rows else []
        
        return KustoQueryResponse(
            columns=columns,
            rows=rows,
            row_count=len(rows),
            execution_time_ms=round(elapsed_ms, 2),
        )
        
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tables")
async def list_tables():
    """
    List available tables for querying.
    """
    return {
        "tables": list(ALLOWED_TABLES),
        "description": "These tables are available for custom queries",
    }


@router.get("/examples")
async def get_query_examples():
    """
    Get example queries for common analytics needs.
    """
    return {
        "examples": [
            {
                "name": "Count by Status",
                "description": "Count learners by certification status",
                "query": "CertifiedUsers | summarize count() by learner_status",
            },
            {
                "name": "Top Certified Users",
                "description": "Find users with most certifications",
                "query": "CertifiedUsers | top 10 by total_certs desc | project email, user_handle, total_certs",
            },
            {
                "name": "Recent Certifications",
                "description": "Certifications in last 30 days",
                "query": """CertifiedUsers 
| where first_cert_date != '' 
| extend cert_date = todatetime(first_cert_date)
| where cert_date >= ago(30d)
| summarize count() by bin(cert_date, 1d)""",
            },
            {
                "name": "Product Focus Distribution",
                "description": "Distribution by primary product focus",
                "query": "CertifiedUsers | summarize count() by cert_product_focus | order by count_ desc",
            },
            {
                "name": "Learning to Certification Time",
                "description": "Average days from start to certification",
                "query": """JourneyUsers 
| where time_to_certification > 0
| summarize 
    avg_days = avg(time_to_certification),
    median_days = percentile(time_to_certification, 50),
    count = count()
  by journey_stage""",
            },
        ]
    }
