"""
Company API routes for ROI calculations and search.

Provides endpoints for:
- Company search
- Company ROI metrics
- Company learner listings
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["companies"])


class CompanySearchResult(BaseModel):
    """Company search result."""
    company: str
    learner_count: int
    certified_count: int


class CompanyROI(BaseModel):
    """Company ROI metrics."""
    total_learners: int
    certified_learners: int
    total_certifications: int
    avg_certifications_per_learner: float
    copilot_adopters: int
    actions_adopters: int
    avg_copilot_usage: float
    avg_github_activity: float
    certification_rate: float
    copilot_adoption_rate: float


def get_learner_data():
    """Load learner data from parquet file."""
    from pathlib import Path
    import pandas as pd
    
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    parquet_file = data_dir / "learners_enriched.parquet"
    
    if parquet_file.exists():
        return pd.read_parquet(parquet_file)
    
    # Fallback to CSV
    csv_file = data_dir / "learners_enriched.csv"
    if csv_file.exists():
        return pd.read_csv(csv_file)
    
    return None


@router.get("/search", response_model=dict)
async def search_companies(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
):
    """
    Search for companies by name.
    
    Returns companies matching the search query with learner counts.
    """
    try:
        df = get_learner_data()
        if df is None:
            raise HTTPException(status_code=503, detail="Data not available")
        
        # Filter by company name
        if "company" not in df.columns:
            raise HTTPException(status_code=500, detail="Company column not found")
        
        # Get companies matching query
        companies = df[df["company"].notna() & (df["company"] != "")]
        companies = companies[
            companies["company"].str.lower().str.contains(q.lower(), na=False)
        ]
        
        # Aggregate by company
        if "certification_count" in df.columns:
            company_stats = companies.groupby("company").agg(
                learner_count=("company", "size"),
                certified_count=("certification_count", lambda x: (x > 0).sum()),
            ).reset_index()
        else:
            company_stats = companies.groupby("company").agg(
                learner_count=("company", "size"),
            ).reset_index()
            company_stats["certified_count"] = 0
        
        # Sort by learner count and limit
        company_stats = company_stats.sort_values("learner_count", ascending=False)
        company_stats = company_stats.head(limit)
        
        results = [
            CompanySearchResult(
                company=row["company"],
                learner_count=int(row["learner_count"]),
                certified_count=int(row.get("certified_count", 0)),
            )
            for _, row in company_stats.iterrows()
        ]
        
        return {"companies": [r.dict() for r in results]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top", response_model=dict)
async def get_top_companies(
    limit: int = Query(20, ge=1, le=100, description="Number of companies"),
    min_learners: int = Query(5, ge=1, description="Minimum learners"),
):
    """
    Get top companies by learner count.
    """
    try:
        df = get_learner_data()
        if df is None:
            raise HTTPException(status_code=503, detail="Data not available")
        
        if "company" not in df.columns:
            raise HTTPException(status_code=500, detail="Company column not found")
        
        # Get companies with enough learners
        companies = df[df["company"].notna() & (df["company"] != "")]
        
        # Aggregate
        if "certification_count" in df.columns:
            company_stats = companies.groupby("company").agg(
                learner_count=("company", "size"),
                certified_count=("certification_count", lambda x: (x > 0).sum()),
                total_certs=("certification_count", "sum"),
            ).reset_index()
        else:
            company_stats = companies.groupby("company").agg(
                learner_count=("company", "size"),
            ).reset_index()
            company_stats["certified_count"] = 0
            company_stats["total_certs"] = 0
        
        # Filter and sort
        company_stats = company_stats[company_stats["learner_count"] >= min_learners]
        company_stats = company_stats.sort_values("learner_count", ascending=False)
        company_stats = company_stats.head(limit)
        
        return {
            "companies": company_stats.to_dict(orient="records"),
            "total": len(company_stats),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting top companies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Separate router for individual company endpoints
company_router = APIRouter(prefix="/company", tags=["companies"])


@company_router.get("/{company}/roi", response_model=CompanyROI)
async def get_company_roi(company: str):
    """
    Get ROI metrics for a specific company.
    
    Returns learner counts, certification rates, and product adoption metrics.
    """
    try:
        df = get_learner_data()
        if df is None:
            raise HTTPException(status_code=503, detail="Data not available")
        
        # Filter by company
        company_df = df[df["company"] == company]
        
        if company_df.empty:
            raise HTTPException(status_code=404, detail=f"Company not found: {company}")
        
        total_learners = len(company_df)
        
        # Calculate certification metrics
        if "certification_count" in company_df.columns:
            certified_learners = int((company_df["certification_count"] > 0).sum())
            total_certifications = int(company_df["certification_count"].sum())
            avg_certs = company_df["certification_count"].mean()
        else:
            certified_learners = 0
            total_certifications = 0
            avg_certs = 0
        
        # Calculate product usage metrics
        if "uses_copilot" in company_df.columns:
            copilot_adopters = int(company_df["uses_copilot"].sum())
        elif "copilot_days_90d" in company_df.columns:
            copilot_adopters = int((company_df["copilot_days_90d"] > 0).sum())
        else:
            copilot_adopters = 0
        
        if "uses_actions" in company_df.columns:
            actions_adopters = int(company_df["uses_actions"].sum())
        elif "actions_days_90d" in company_df.columns:
            actions_adopters = int((company_df["actions_days_90d"] > 0).sum())
        else:
            actions_adopters = 0
        
        if "copilot_days_90d" in company_df.columns:
            avg_copilot = company_df["copilot_days_90d"].mean()
        else:
            avg_copilot = 0
        
        if "total_active_days_90d" in company_df.columns:
            avg_activity = company_df["total_active_days_90d"].mean()
        else:
            avg_activity = 0
        
        # Calculate rates
        certification_rate = (certified_learners / total_learners * 100) if total_learners > 0 else 0
        copilot_adoption_rate = (copilot_adopters / total_learners * 100) if total_learners > 0 else 0
        
        return CompanyROI(
            total_learners=total_learners,
            certified_learners=certified_learners,
            total_certifications=total_certifications,
            avg_certifications_per_learner=float(avg_certs) if avg_certs else 0,
            copilot_adopters=copilot_adopters,
            actions_adopters=actions_adopters,
            avg_copilot_usage=float(avg_copilot) if avg_copilot else 0,
            avg_github_activity=float(avg_activity) if avg_activity else 0,
            certification_rate=certification_rate,
            copilot_adoption_rate=copilot_adoption_rate,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting company ROI: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@company_router.get("/{company}/learners", response_model=dict)
async def get_company_learners(
    company: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    certified_only: bool = Query(False),
):
    """
    Get learners for a specific company.
    """
    try:
        df = get_learner_data()
        if df is None:
            raise HTTPException(status_code=503, detail="Data not available")
        
        # Filter by company
        company_df = df[df["company"] == company]
        
        if company_df.empty:
            raise HTTPException(status_code=404, detail=f"Company not found: {company}")
        
        # Filter by certification status
        if certified_only and "certification_count" in company_df.columns:
            company_df = company_df[company_df["certification_count"] > 0]
        
        total = len(company_df)
        
        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        page_df = company_df.iloc[start:end]
        
        # Select columns to return
        columns = ["dotcom_id", "email", "first_name", "last_name", "certification_count", "journey_stage"]
        available_cols = [c for c in columns if c in page_df.columns]
        
        learners = page_df[available_cols].to_dict(orient="records")
        
        return {
            "learners": learners,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting company learners: {e}")
        raise HTTPException(status_code=500, detail=str(e))
