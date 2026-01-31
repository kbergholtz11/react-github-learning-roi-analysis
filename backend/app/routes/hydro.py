"""Hydro analytics routes for GitHub Docs, Skills, and Learning activity."""

from fastapi import APIRouter, HTTPException, Query

from ..kusto import get_kusto_service

router = APIRouter(prefix="/hydro", tags=["hydro"])


@router.get("/docs/stats")
async def get_docs_stats(days: int = Query(default=30, ge=1, le=365)):
    """Get GitHub Docs page view statistics.

    Returns aggregated view counts per documentation section.
    """
    kusto = get_kusto_service()

    if not kusto.is_available:
        raise HTTPException(status_code=503, detail="Kusto service is not connected")

    query = f"""
    analytics_v0_page_view
    | where timestamp > ago({days}d)
    | where page has "docs.github.com"
    | extend 
        doc_section = extract(@"docs\\.github\\.com/([^/]+/[^/]+)", 1, page),
        doc_category = extract(@"docs\\.github\\.com/([^/]+)", 1, page)
    | where isnotempty(doc_section)
    | summarize 
        total_views = count(),
        unique_users = dcount(actor_id)
      by doc_section
    | top 25 by total_views desc
    """

    try:
        results = kusto.execute_on_gh_hydro(query)
        return {
            "days": days,
            "sections": results,
            "total_sections": len(results),
            "source": "kusto",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/docs/trends")
async def get_docs_trends(days: int = Query(default=30, ge=1, le=90)):
    """Get daily docs page view trends."""
    kusto = get_kusto_service()

    if not kusto.is_available:
        raise HTTPException(status_code=503, detail="Kusto service is not connected")

    query = f"""
    analytics_v0_page_view
    | where timestamp > ago({days}d)
    | where page has "docs.github.com"
    | summarize 
        page_views = count(),
        unique_users = dcount(actor_id)
      by date = bin(timestamp, 1d)
    | order by date asc
    """

    try:
        results = kusto.execute_on_gh_hydro(query)
        return {"days": days, "trends": results, "source": "kusto"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/skills/stats")
async def get_skills_stats(days: int = Query(default=30, ge=1, le=365)):
    """Get GitHub Skills page view statistics.

    Returns skill course engagement metrics.
    """
    kusto = get_kusto_service()

    if not kusto.is_available:
        raise HTTPException(status_code=503, detail="Kusto service is not connected")

    query = f"""
    analytics_v0_page_view
    | where timestamp > ago({days}d)
    | where page has "skills.github.com" or page has "/skills/"
    | extend 
        skill_name = extract(@"skills/([^/\\?]+)", 1, page)
    | where isnotempty(skill_name)
    | summarize 
        total_views = count(),
        unique_users = dcount(actor_id)
      by skill_name
    | top 25 by unique_users desc
    """

    try:
        results = kusto.execute_on_gh_hydro(query)
        return {"days": days, "skills": results, "total_skills": len(results), "source": "kusto"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/learn/stats")
async def get_learn_stats(days: int = Query(default=30, ge=1, le=365)):
    """Get GitHub Learn page view statistics.

    Returns learning path engagement metrics.
    """
    kusto = get_kusto_service()

    if not kusto.is_available:
        raise HTTPException(status_code=503, detail="Kusto service is not connected")

    query = f"""
    analytics_v0_page_view
    | where timestamp > ago({days}d)
    | where page has "learn.github.com" or page has "/learn/"
    | extend 
        learn_path = extract(@"learn/([^/\\?]+)", 1, page),
        learn_category = extract(@"learn/([^/]+)/([^/\\?]+)", 2, page)
    | where isnotempty(learn_path)
    | summarize 
        total_views = count(),
        unique_users = dcount(actor_id)
      by learn_path
    | top 25 by unique_users desc
    """

    try:
        results = kusto.execute_on_gh_hydro(query)
        return {"days": days, "paths": results, "total_paths": len(results), "source": "kusto"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/page-views")
async def get_page_view_stats(days: int = Query(default=7, ge=1, le=90)):
    """Get overall page view statistics from Hydro for learning-related pages."""
    kusto = get_kusto_service()

    if not kusto.is_available:
        raise HTTPException(status_code=503, detail="Kusto service is not connected")

    # More targeted query focusing on learning-related pages
    query = f"""
    analytics_v0_page_view
    | where timestamp > ago({days}d)
    | where page has "docs.github.com" 
        or page has "learn.github.com" 
        or page has "skills.github.com"
        or page has "/docs/" 
        or page has "/learn/" 
        or page has "/skills/"
    | extend 
        page_type = case(
            page has "docs", "docs",
            page has "learn", "learn",
            page has "skills", "skills",
            "other"
        )
    | summarize 
        total_views = count(),
        unique_users = dcount(actor_id)
      by page_type
    | order by total_views desc
    """

    try:
        results = kusto.execute_on_gh_hydro(query)
        return {"days": days, "categories": results, "source": "kusto"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/dau")
async def get_daily_active_users(days: int = Query(default=30, ge=1, le=90)):
    """Get daily active user counts from learning page views."""
    kusto = get_kusto_service()

    if not kusto.is_available:
        raise HTTPException(status_code=503, detail="Kusto service is not connected")

    # Targeted to learning pages only
    query = f"""
    analytics_v0_page_view
    | where timestamp > ago({days}d)
    | where page has "docs.github.com" 
        or page has "learn.github.com" 
        or page has "skills.github.com"
    | summarize dau = dcount(actor_id) by date = bin(timestamp, 1d)
    | order by date asc
    """

    try:
        results = kusto.execute_on_gh_hydro(query)
        return {"days": days, "dau": results, "source": "kusto"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
