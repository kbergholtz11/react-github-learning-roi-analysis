#!/usr/bin/env python3
"""
Sync Historical Skills/Learn Data from Trino (Hive)

This script fetches historical skills and learning data from GitHub's
Trino/Hive warehouse, which has longer retention than Kusto (~7+ months
vs ~90 days).

=============================================================================
DATA ARCHITECTURE (from github/data learn-data.md)
=============================================================================

KUSTO (gh-analytics) limitations:
  - Uses hot cache for analytics_v0_page_view
  - Retention: ~90 days (kusto-retention-days setting in hydro-schemas)
  - Access: No VPN required

TRINO/HIVE (production warehouse):
  - Full data retention: 7+ months
  - Table: hive_hydro.hydro.analytics_v0_page_view
  - Access: Requires Production VPN
  - Connection: via Octopy library (github/octopy)

TRINO CLUSTERS (from trino_clusters.md):
  - trino-adhoc: For ad-hoc queries (2 concurrent queries per user)
  - trino-airflow: For DAGs
  - See: https://github.com/github/data/blob/master/docs/trino_clusters.md

=============================================================================
PREREQUISITES
=============================================================================

1. Install Octopy:
   gh repo clone github/octopy /tmp/octopy && pip install /tmp/octopy

2. Connect to Production VPN:
   - Visit: https://thehub.github.com/security/security-operations/production-vpn-access/
   - Configure Viscosity with Production profile
   - Connect before running this script

3. Run this script:
   python scripts/sync-trino-skills.py

=============================================================================
OUTPUT
=============================================================================

  data/skills_historical_trino.csv - Skills course engagement (skills/* repos)
  data/learn_historical_trino.csv - GitHub Learn engagement (learn.github.com)

The main sync script (sync-enriched-learners.py) will automatically merge
this historical data when available, providing 7+ months of Skills/Learn
data instead of just ~90 days.

=============================================================================
QUESTIONS?
=============================================================================

  - Data Dot: https://data.githubapp.com/
  - Slack: #data, #data-engineering
  - Data Request: https://github.com/github/data/issues/new?labels=Data+Request
"""

import os
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Logging helper
def log(msg: str, level: str = "info"):
    """Simple logging with timestamp."""
    icons = {"info": "ℹ️", "success": "✅", "error": "❌", "start": "🚀", "warning": "⚠️"}
    icon = icons.get(level, "•")
    print(f"{icon} [{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_trino_client():
    """Get Octopy Presto/Trino client."""
    try:
        from octopy.db import Presto
        return Presto()
    except ImportError:
        log("Octopy not installed. Run: gh repo clone github/octopy /tmp/octopy && pip install /tmp/octopy", "error")
        sys.exit(1)


def fetch_historical_skills(db, start_date: str = "2025-07-01") -> pd.DataFrame:
    """
    Fetch historical skills page views from Trino/Hive.
    
    Args:
        db: Octopy Presto client
        start_date: Start date for data (YYYY-MM-DD format)
    
    Returns:
        DataFrame with skills page views per user
    """
    log(f"Fetching skills page views since {start_date}...", "start")
    
    query = f"""
    SELECT 
        actor_id as dotcom_id,
        COUNT(*) as skills_page_views,
        COUNT(DISTINCT DATE(timestamp)) as skills_sessions,
        MIN(timestamp) as first_skills_visit,
        MAX(timestamp) as last_skills_visit,
        ARRAY_JOIN(ARRAY_AGG(DISTINCT SPLIT_PART(repository_nwo, '/', 2)), ',') as skills_completed,
        COUNT(DISTINCT SPLIT_PART(repository_nwo, '/', 2)) as skills_count,
        -- Category counts
        COUNT(DISTINCT CASE 
            WHEN repository_nwo LIKE '%copilot%' OR repository_nwo LIKE '%mcp%' 
            THEN SPLIT_PART(repository_nwo, '/', 2) 
        END) as ai_skills_count,
        COUNT(DISTINCT CASE 
            WHEN repository_nwo LIKE '%action%' OR repository_nwo LIKE '%workflow%'
            THEN SPLIT_PART(repository_nwo, '/', 2)
        END) as actions_skills_count,
        COUNT(DISTINCT CASE 
            WHEN repository_nwo LIKE '%git%' OR repository_nwo LIKE '%pull-request%' 
                 OR repository_nwo LIKE '%github%' OR repository_nwo LIKE '%introduction%'
            THEN SPLIT_PART(repository_nwo, '/', 2)
        END) as git_skills_count,
        COUNT(DISTINCT CASE 
            WHEN repository_nwo LIKE '%security%' OR repository_nwo LIKE '%secret%' 
                 OR repository_nwo LIKE '%codeql%'
            THEN SPLIT_PART(repository_nwo, '/', 2)
        END) as security_skills_count
    FROM hive_hydro.hydro.analytics_v0_page_view
    WHERE repository_nwo LIKE 'skills/%'
        AND timestamp >= TIMESTAMP '{start_date}'
        AND actor_id IS NOT NULL
        AND actor_id > 0
    GROUP BY actor_id
    """
    
    try:
        df = db.execute(query, return_type="df", verbose=True)
        log(f"Fetched {len(df):,} users with skills activity", "success")
        return df
    except Exception as e:
        log(f"Error fetching skills data: {e}", "error")
        return pd.DataFrame()


def fetch_historical_learn(db, start_date: str = "2025-07-01") -> pd.DataFrame:
    """
    Fetch historical GitHub Learn page views from Trino/Hive.
    
    Args:
        db: Octopy Presto client
        start_date: Start date for data (YYYY-MM-DD format)
    
    Returns:
        DataFrame with learn page views per user
    """
    log(f"Fetching GitHub Learn page views since {start_date}...", "start")
    
    query = f"""
    SELECT 
        actor_id as dotcom_id,
        COUNT(*) as learn_page_views,
        COUNT(DISTINCT DATE(timestamp)) as learn_sessions,
        MIN(timestamp) as first_learn_visit,
        MAX(timestamp) as last_learn_visit,
        -- Content type breakdown
        COUNT(CASE WHEN page LIKE '%/certifications%' OR page LIKE '%/certification/%' THEN 1 END) as viewed_certifications,
        COUNT(CASE WHEN page LIKE '%/skills%' THEN 1 END) as viewed_skills,
        COUNT(CASE WHEN page LIKE '%/learning%' THEN 1 END) as viewed_learning
    FROM hive_hydro.hydro.analytics_v0_page_view
    WHERE app = 'learn'
        AND (page LIKE '%learn.github.com%' OR page IS NULL)
        AND timestamp >= TIMESTAMP '{start_date}'
        AND actor_id IS NOT NULL
        AND actor_id > 0
    GROUP BY actor_id
    """
    
    try:
        df = db.execute(query, return_type="df", verbose=True)
        log(f"Fetched {len(df):,} users with learn activity", "success")
        return df
    except Exception as e:
        log(f"Error fetching learn data: {e}", "error")
        return pd.DataFrame()


def main():
    """Main sync function."""
    log("=" * 60)
    log("Trino Historical Skills/Learn Sync")
    log("=" * 60)
    
    # Check VPN connection
    log("Connecting to Trino (requires Production VPN)...", "start")
    db = get_trino_client()
    
    # Test connection
    try:
        test_df = db.execute("SELECT 1 as test", return_type="df")
        log("Trino connection successful!", "success")
    except Exception as e:
        log(f"Connection failed. Are you on Production VPN? Error: {e}", "error")
        log("Connect to VPN and try again.", "warning")
        sys.exit(1)
    
    # Fetch data
    start_date = "2025-07-01"  # Start from July 2025 for historical data
    
    # Skills data
    df_skills = fetch_historical_skills(db, start_date)
    if not df_skills.empty:
        skills_file = DATA_DIR / "skills_historical_trino.csv"
        df_skills.to_csv(skills_file, index=False)
        log(f"Saved {len(df_skills):,} skills records to {skills_file.name}", "success")
        
        # Date range
        log(f"  Skills date range: {df_skills['first_skills_visit'].min()} to {df_skills['last_skills_visit'].max()}")
    
    # Learn data  
    df_learn = fetch_historical_learn(db, start_date)
    if not df_learn.empty:
        learn_file = DATA_DIR / "learn_historical_trino.csv"
        df_learn.to_csv(learn_file, index=False)
        log(f"Saved {len(df_learn):,} learn records to {learn_file.name}", "success")
        
        # Date range
        log(f"  Learn date range: {df_learn['first_learn_visit'].min()} to {df_learn['last_learn_visit'].max()}")
    
    log("=" * 60)
    log("Historical sync complete!", "success")
    log("Run sync-enriched-learners.py to merge with main data.", "info")


if __name__ == "__main__":
    main()
