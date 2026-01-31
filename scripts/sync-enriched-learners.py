#!/usr/bin/env python3
"""
Comprehensive Learner Enrichment Sync Script

Syncs ALL learner data with full enrichment from GitHub's canonical tables.
Follows GitHub Data architecture patterns from:
  - https://github.com/github/data/blob/master/docs/learn-data.md
  - Data Dot: https://data.githubapp.com/

=============================================================================
DATA SOURCES (following GitHub's data hierarchy)
=============================================================================

CANONICAL TABLES (curated, high-quality):
  - canonical.accounts_all: User demographics, plan info
    https://data.githubapp.com/warehouse/hive/canonical/accounts_all
  - canonical.relationships_all: User↔Org relationships  
    https://data.githubapp.com/warehouse/hive/canonical/relationships_all
  - canonical.account_hierarchy_global_all: Company/customer attribution
    https://data.githubapp.com/warehouse/hive/canonical/account_hierarchy_global_all
  - canonical.user_daily_activity_per_product: Product usage (Copilot, Actions, etc.)
    https://data.githubapp.com/warehouse/hive/canonical/user_daily_activity_per_product

HYDRO TABLES (event streams):
  - hydro.analytics_v0_page_view: Skills/Learn page views (~90 day retention in Kusto)
  - hydro.github_v1_user_signup: Email-to-dotcom_id mapping

SNAPSHOT TABLES (production DB copies):
  - snapshots.github_mysql1_user_emails_current: Verified email mapping

ACE TABLES (certification-specific):
  - ace.exam_results: FY22-25 exam results (gh-analytics cluster)
  - ace.users: ACE portal registrations
  - ACE.pearson_exam_results: FY26 exams (cse-analytics cluster)

=============================================================================
QUERY MAPPING
=============================================================================
  Query 1: ACE Learners (users, certifications, exams, events) - BASE POPULATION
  Query 2: Skills/Learn Activity (hydro page views)
  Query 2B: Skills Users (skills/* repos) - ADDED TO BASE (62k+ new learners!)
  Query 2C: GitHub Learn (learn.github.com) engagement
  Query 3: Partner Credentials (cse-analytics cluster)
  Query 4: User Demographics (canonical.accounts_all)
  Query 5: Org Enrichment (relationships → account_hierarchy_global_all via global_id)
  Query 5B: Direct User Company (account_hierarchy_dotcom_all)
  Query 7: Product Usage (canonical.user_daily_activity_per_product)

Company attribution uses account_hierarchy_global_all with priority:
  1. customer_name (billing customer - most authoritative, 1:1 with Zuora)
  2. salesforce_account_name (CRM account)
  3. salesforce_parent_account_name (CRM parent)
  4. partner_companies (partner credential)
  5. org_name (GitHub org login fallback)

=============================================================================
RETENTION NOTES
=============================================================================
  - Kusto hydro tables: ~90 days (hot cache limit)
  - Trino/Hive hydro tables: 7+ months (requires Production VPN)
  - Canonical tables: Generally 2+ years historical
  - ACE tables: Full history since program inception

For historical Skills/Learn data beyond 90 days, run sync-trino-skills.py first.

Output: data/learners_enriched.parquet

Usage:
  python scripts/sync-enriched-learners.py [--full] [--dry-run]

Options:
  --full      Force full refresh (ignore existing data)
  --dry-run   Show queries without executing

Questions? Open a Data Request: 
  https://github.com/github/data/issues/new?assignees=&labels=Data+Request
"""

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# Cluster URIs
CSE_CLUSTER = "https://cse-analytics.centralus.kusto.windows.net"
GH_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "learners_enriched.parquet"
SYNC_STATUS_FILE = DATA_DIR / "sync_status.json"
CACHE_DIR = DATA_DIR / ".cache"  # Cache directory for incremental syncs

# Cache TTL in hours (how long cached data is considered fresh)
CACHE_TTL_HOURS = {
    "ace_learners": 4,      # Base learner data - refresh every 4 hours
    "demographics": 24,     # User demographics - stable, refresh daily
    "org_enrichment": 24,   # Org data - stable, refresh daily
    "product_usage": 6,     # Usage data - refresh every 6 hours
    "github_learn": 12,     # GitHub Learn activity - refresh every 12 hours
    "skills_users": 12,     # Skills course users - refresh every 12 hours
    "partner_creds": 24,    # Partner data - stable, refresh daily
}

# Country to Region mapping
COUNTRY_TO_REGION = {
    # Americas
    "US": "AMER", "CA": "AMER", "MX": "AMER", "BR": "AMER", "AR": "AMER", "CL": "AMER",
    "CO": "AMER", "PE": "AMER", "VE": "AMER", "EC": "AMER", "UY": "AMER", "PY": "AMER",
    "BO": "AMER", "CR": "AMER", "PA": "AMER", "DO": "AMER", "GT": "AMER", "HN": "AMER",
    "SV": "AMER", "NI": "AMER", "PR": "AMER", "JM": "AMER", "TT": "AMER", "BB": "AMER",
    # EMEA
    "GB": "EMEA", "DE": "EMEA", "FR": "EMEA", "IT": "EMEA", "ES": "EMEA", "NL": "EMEA",
    "BE": "EMEA", "CH": "EMEA", "AT": "EMEA", "SE": "EMEA", "NO": "EMEA", "DK": "EMEA",
    "FI": "EMEA", "IE": "EMEA", "PT": "EMEA", "PL": "EMEA", "CZ": "EMEA", "RO": "EMEA",
    "HU": "EMEA", "GR": "EMEA", "UA": "EMEA", "RU": "EMEA", "TR": "EMEA", "IL": "EMEA",
    "AE": "EMEA", "SA": "EMEA", "ZA": "EMEA", "EG": "EMEA", "NG": "EMEA", "KE": "EMEA",
    "MA": "EMEA", "TN": "EMEA", "GH": "EMEA", "LU": "EMEA", "SK": "EMEA", "BG": "EMEA",
    "HR": "EMEA", "SI": "EMEA", "RS": "EMEA", "LT": "EMEA", "LV": "EMEA", "EE": "EMEA",
    # APAC
    "JP": "APAC", "CN": "APAC", "IN": "APAC", "AU": "APAC", "KR": "APAC", "SG": "APAC",
    "HK": "APAC", "TW": "APAC", "MY": "APAC", "TH": "APAC", "ID": "APAC", "PH": "APAC",
    "VN": "APAC", "NZ": "APAC", "PK": "APAC", "BD": "APAC", "LK": "APAC", "NP": "APAC",
    "MM": "APAC", "KH": "APAC", "LA": "APAC", "MN": "APAC",
}


def log(msg: str, level: str = "info"):
    """Print a log message with timestamp."""
    icons = {
        "info": "ℹ️",
        "success": "✅",
        "warning": "⚠️",
        "error": "❌",
        "start": "🚀",
        "debug": "🔍",
        "data": "📊",
    }
    icon = icons.get(level, "•")
    print(f"{icon} [{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_kusto_client(cluster_uri: str):
    """Get a Kusto client for the specified cluster."""
    try:
        from azure.identity import DefaultAzureCredential
        from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

        credential = DefaultAzureCredential()
        kcsb = KustoConnectionStringBuilder.with_azure_token_credential(cluster_uri, credential)
        return KustoClient(kcsb)
    except Exception as e:
        log(f"Failed to create Kusto client for {cluster_uri}: {e}", "error")
        return None


def execute_query(
    client, database: str, query: str, description: str = "query"
) -> Optional[pd.DataFrame]:
    """Execute a Kusto query and return results as DataFrame."""
    if not client:
        log(f"No Kusto client available for {description}", "error")
        return None

    try:
        log(f"Executing {description}...", "debug")
        start = datetime.now()
        response = client.execute_query(database, query)

        if response.primary_results:
            columns = [col.column_name for col in response.primary_results[0].columns]
            rows = [list(row) for row in response.primary_results[0].rows]
            df = pd.DataFrame(rows, columns=columns)
            elapsed = (datetime.now() - start).total_seconds()
            log(f"{description}: {len(df):,} rows in {elapsed:.1f}s", "data")
            return df
        return pd.DataFrame()
    except Exception as e:
        log(f"{description} failed: {e}", "error")
        return None


# =============================================================================
# CACHING FUNCTIONS - Skip re-fetching data that hasn't changed
# =============================================================================

def get_cache_path(query_name: str) -> Path:
    """Get the cache file path for a query."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{query_name}.parquet"


def is_cache_valid(query_name: str, force_refresh: bool = False) -> bool:
    """Check if cached data is still valid (within TTL)."""
    if force_refresh:
        return False
    
    cache_path = get_cache_path(query_name)
    if not cache_path.exists():
        return False
    
    # Check file modification time against TTL
    ttl_hours = CACHE_TTL_HOURS.get(query_name, 6)  # Default 6 hours
    file_age_hours = (datetime.now().timestamp() - cache_path.stat().st_mtime) / 3600
    
    if file_age_hours < ttl_hours:
        log(f"  Using cached {query_name} ({file_age_hours:.1f}h old, TTL={ttl_hours}h)", "debug")
        return True
    return False


def load_from_cache(query_name: str) -> Optional[pd.DataFrame]:
    """Load DataFrame from cache if valid."""
    cache_path = get_cache_path(query_name)
    try:
        df = pd.read_parquet(cache_path)
        log(f"  Loaded {query_name} from cache: {len(df):,} rows", "success")
        return df
    except Exception as e:
        log(f"  Cache read failed for {query_name}: {e}", "warning")
        return None


def save_to_cache(query_name: str, df: pd.DataFrame):
    """Save DataFrame to cache."""
    if df is None or df.empty:
        return
    cache_path = get_cache_path(query_name)
    try:
        df.to_parquet(cache_path, index=False, compression="snappy")
        log(f"  Cached {query_name}: {len(df):,} rows", "debug")
    except Exception as e:
        log(f"  Cache write failed for {query_name}: {e}", "warning")


def load_trino_historical_data() -> tuple[Optional[pd.DataFrame], Optional[pd.DataFrame]]:
    """
    Load historical Skills/Learn data from Trino exports if available.
    
    Trino/Hive has longer retention (~7+ months) compared to Kusto (~90 days).
    Run scripts/sync-trino-skills.py to generate these files.
    
    Returns:
        Tuple of (skills_df, learn_df) or (None, None) if not available
    """
    skills_file = DATA_DIR / "skills_historical_trino.csv"
    learn_file = DATA_DIR / "learn_historical_trino.csv"
    
    skills_df = None
    learn_df = None
    
    if skills_file.exists():
        try:
            skills_df = pd.read_csv(skills_file)
            # Parse dates
            for col in ['first_skills_visit', 'last_skills_visit']:
                if col in skills_df.columns:
                    skills_df[col] = pd.to_datetime(skills_df[col], errors='coerce')
            log(f"Loaded Trino historical skills: {len(skills_df):,} users", "success")
            log(f"  Date range: {skills_df['first_skills_visit'].min()} to {skills_df['last_skills_visit'].max()}")
        except Exception as e:
            log(f"Failed to load Trino skills data: {e}", "warning")
    
    if learn_file.exists():
        try:
            learn_df = pd.read_csv(learn_file)
            # Parse dates
            for col in ['first_learn_visit', 'last_learn_visit']:
                if col in learn_df.columns:
                    learn_df[col] = pd.to_datetime(learn_df[col], errors='coerce')
            log(f"Loaded Trino historical learn: {len(learn_df):,} users", "success")
            log(f"  Date range: {learn_df['first_learn_visit'].min()} to {learn_df['last_learn_visit'].max()}")
        except Exception as e:
            log(f"Failed to load Trino learn data: {e}", "warning")
    
    return skills_df, learn_df


def execute_query_with_cache(
    client, database: str, query: str, query_name: str, 
    force_refresh: bool = False
) -> Optional[pd.DataFrame]:
    """Execute query with caching support."""
    # Check cache first
    if is_cache_valid(query_name, force_refresh):
        cached = load_from_cache(query_name)
        if cached is not None:
            return cached
    
    # Execute query
    df = execute_query(client, database, query, query_name)
    
    # Save to cache
    if df is not None and not df.empty:
        save_to_cache(query_name, df)
    
    return df


# =============================================================================
# OPTIMIZED MERGE OPERATIONS - Use index-based joins for speed
# =============================================================================

def merge_on_dotcom_id(base_df: pd.DataFrame, right_df: pd.DataFrame, 
                       right_name: str) -> pd.DataFrame:
    """
    Optimized merge on dotcom_id using index-based join.
    ~2x faster than default pandas merge for large DataFrames.
    
    For columns that already exist in base_df, this will UPDATE/FILL
    values where base_df has NaN but right_df has data (coalesce pattern).
    """
    if right_df is None or right_df.empty:
        return base_df
    
    start = datetime.now()
    
    # Set index on right DataFrame for faster join
    if "dotcom_id" in right_df.columns:
        right_indexed = right_df.set_index("dotcom_id", drop=False)
        
        # Use join instead of merge (faster with index)
        if "dotcom_id" in base_df.columns:
            base_indexed = base_df.set_index("dotcom_id", drop=False)
            
            # Split columns into new (to add) and existing (to update)
            cols_to_add = [c for c in right_df.columns if c != "dotcom_id" and c not in base_df.columns]
            cols_to_update = [c for c in right_df.columns if c != "dotcom_id" and c in base_df.columns]
            
            # Add new columns via join
            if cols_to_add:
                result = base_indexed.join(right_indexed[cols_to_add], how="left", rsuffix="_right")
            else:
                result = base_indexed.copy()
            
            # Update existing columns by filling NaN values with right_df data
            if cols_to_update:
                update_count = 0
                for col in cols_to_update:
                    # Get the right values aligned by index (dotcom_id)
                    right_values = right_indexed[col]
                    # Only update rows where base is NaN/null
                    mask = result[col].isna()
                    if mask.any():
                        # Map right values to result index
                        result.loc[mask, col] = result.loc[mask].index.map(
                            lambda x: right_values.get(x, None)
                        )
                        update_count += mask.sum()
                if update_count > 0:
                    log(f"  Updated {update_count:,} values in existing columns from {right_name}", "debug")
            
            result = result.reset_index(drop=True)
        else:
            result = base_df.merge(right_df, on="dotcom_id", how="left")
    else:
        result = base_df
    
    elapsed = (datetime.now() - start).total_seconds()
    log(f"After {right_name} merge: {len(result):,} rows ({elapsed:.2f}s)", "info")
    return result


def update_sync_status(source: str, status: str, rows: int = 0, error: str = None):
    """Update sync status tracking file."""
    status_data = {}
    if SYNC_STATUS_FILE.exists():
        with open(SYNC_STATUS_FILE) as f:
            status_data = json.load(f)

    status_data[source] = {
        "last_sync": datetime.now().isoformat(),
        "status": status,
        "rows": rows,
        "error": error,
    }

    with open(SYNC_STATUS_FILE, "w") as f:
        json.dump(status_data, f, indent=2)


def execute_queries_parallel(
    queries: List[Tuple[Any, str, str, str]],
    max_workers: int = 4
) -> Dict[str, Optional[pd.DataFrame]]:
    """
    Execute multiple Kusto queries in parallel for faster sync.
    
    Args:
        queries: List of tuples (client, database, query, description)
        max_workers: Maximum parallel threads (default 4 to avoid throttling)
    
    Returns:
        Dict mapping description to DataFrame result (or None if failed)
    """
    results = {}
    
    def run_query(client, database, query, description):
        return description, execute_query(client, database, query, description)
    
    log(f"Executing {len(queries)} queries in parallel (max {max_workers} workers)...", "start")
    start_time = datetime.now()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(run_query, client, db, query, desc): desc
            for client, db, query, desc in queries
        }
        
        for future in as_completed(futures):
            try:
                desc, df = future.result()
                results[desc] = df
                if df is not None:
                    log(f"  ✓ {desc}: {len(df):,} rows", "success")
                else:
                    log(f"  ✗ {desc}: failed", "error")
            except Exception as e:
                desc = futures[future]
                results[desc] = None
                log(f"  ✗ {desc}: {e}", "error")
    
    elapsed = (datetime.now() - start_time).total_seconds()
    log(f"Parallel execution completed in {elapsed:.1f}s", "success")
    return results


# =============================================================================
# QUERY DEFINITIONS
# =============================================================================

# Query 1: ALL Learners - unions FY22-25 + FY26 exams, ACE registrations, events
# Uses proven pattern from sync-all-data.py for complete learner population
# NOTE: This query runs against CSE cluster (ACE database) since pearson_exam_results is there
QUERY_1_ACE_LEARNERS = """
// =============================================================================
// EMAIL TO DOTCOM_ID MAPPING - Multiple authoritative sources
// =============================================================================
let snapshots_mapping = cluster('gh-analytics.eastus.kusto.windows.net').database('snapshots').github_mysql1_user_emails_current
    | where state == "verified"
    | extend email = tolower(deobfuscated_email), dotcom_id = tolong(user_id)
    | where isnotempty(email) and dotcom_id > 0
    | summarize dotcom_id = max(dotcom_id), user_handle = "" by email;

let signup_mapping = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').github_v1_user_signup
    | extend email = tolower(tostring(email.address)), dotcom_id = tolong(actor.id),
             user_handle = tolower(tostring(actor.login))
    | where isnotempty(email) and dotcom_id > 0
    | summarize dotcom_id = max(dotcom_id), user_handle = take_any(user_handle) by email;

let exam_mapping = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where isnotempty(email) and dotcomid != ""
    | extend email_lower = tolower(email), dotcom_id = tolong(dotcomid),
             user_handle = tolower(userhandle)
    | summarize dotcom_id = max(dotcom_id), user_handle = take_any(user_handle) by email = email_lower;

// Combine mappings - snapshots is authoritative, then signup, then exam
let email_to_id = union snapshots_mapping, signup_mapping, exam_mapping
    | summarize dotcom_id = max(dotcom_id), user_handle = take_any(user_handle) by email;

// =============================================================================
// EXAM DATA - Union FY22-25 (gh-analytics) + FY26 (cse-analytics/pearson)
// Include company and country from exam registration for maximum enrichment
// =============================================================================
let FY22_25_exams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | extend 
        email = tolower(email), 
        exam_name = examname, 
        exam_code = examcode, 
        exam_date = endtime, 
        passed_flag = iff(passed == true, 1, 0),
        first_name = firstname,
        last_name = lastname,
        exam_company = company,
        exam_company_type = companytype,
        exam_country = country,
        exam_region = region
    | project email, exam_name, exam_code, exam_date, passed_flag, first_name, last_name,
              exam_company, exam_company_type, exam_country, exam_region;

let FY26_exams = pearson_exam_results
    | extend 
        email = tolower(['Candidate Email']), 
        exam_name = ['Exam Title'],
        exam_code = ['Exam Series Code'], 
        exam_date = Date,
        passed_flag = iff(['Total Passed'] > 0, 1, 0),
        first_name = ['Candidate First Name'],
        last_name = ['Candidate Last Name'],
        exam_company = "",
        exam_company_type = "",
        exam_country = ['Candidate Country'],
        exam_region = ['Candidate Region']
    | project email, exam_name, exam_code, exam_date, passed_flag, first_name, last_name,
              exam_company, exam_company_type, exam_country, exam_region;

// Aggregate all exam data by email - preserve company/country from exam registration
let all_exam_agg = union FY22_25_exams, FY26_exams
    | summarize
        total_exams = count(),
        exams_passed = sum(passed_flag),
        first_exam = min(exam_date),
        last_exam = max(exam_date),
        cert_names = make_set_if(exam_name, passed_flag == 1, 10),
        exam_codes = make_set(exam_code, 10),
        first_name = take_any(first_name),
        last_name = take_any(last_name),
        exam_company = max(exam_company),
        exam_company_type = max(exam_company_type),
        exam_country = max(exam_country),
        exam_region = max(exam_region)
    by email
    | where isnotempty(email);

// =============================================================================
// ACE PORTAL REGISTRATIONS (from gh-analytics)
// =============================================================================
let ace_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | extend
        email = tolower(email),
        ace_dotcom_id = tolong(dotcomid),
        ace_userhandle = tolower(userhandle),
        ace_first_name = firstname,
        ace_last_name = lastname,
        job_role = jobrole,
        ace_company = company,
        ace_country = country,
        ace_region = region,
        ace_company_type = companytype,
        registration_date = acceptedterms
    | where isnotempty(email)
    | project email, ace_dotcom_id, ace_userhandle, ace_first_name, ace_last_name, 
              job_role, ace_company, ace_country, ace_region, ace_company_type, registration_date;

// =============================================================================
// EVENT REGISTRATIONS (from gh-analytics)
// =============================================================================
let event_agg = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').event_registrants
    | extend email = tolower(email)
    | summarize
        events_registered = count(),
        first_event = min(updateddate),
        last_event = max(updateddate)
    by email;

// =============================================================================
// COMBINE ALL SOURCES - Full outer join to capture everyone
// =============================================================================
let combined = all_exam_agg
    | join kind=fullouter ace_users on email
    | join kind=fullouter event_agg on email
    | extend combined_email = coalesce(email, email1, email2)
    | project
        email = combined_email,
        // Name priority: exam data, then ACE registration
        first_name = coalesce(first_name, ace_first_name, ""),
        last_name = coalesce(last_name, ace_last_name, ""),
        // dotcom_id from ACE registration
        ace_dotcom_id = coalesce(ace_dotcom_id, tolong(0)),
        ace_userhandle = coalesce(ace_userhandle, ""),
        job_role = coalesce(job_role, ""),
        // Company from exam registration (FY22-25 has company field)
        exam_company = coalesce(exam_company, ""),
        exam_company_type = coalesce(exam_company_type, ""),
        // Company from ACE portal registration
        ace_company = coalesce(ace_company, ""),
        ace_company_type = coalesce(ace_company_type, ""),
        // Country/region from exam and ACE registration
        exam_country = coalesce(exam_country, ""),
        exam_region = coalesce(exam_region, ""),
        ace_country = coalesce(ace_country, ""),
        ace_region = coalesce(ace_region, ""),
        registration_date,
        total_exams = coalesce(total_exams, 0),
        exams_passed = coalesce(exams_passed, 0),
        first_exam,
        last_exam,
        cert_names,
        exam_codes,
        events_registered = coalesce(events_registered, 0),
        first_event,
        last_event;

// Join with authoritative email-to-id mapping and add derived fields
combined
| join kind=leftouter email_to_id on email
| extend
    // Use authoritative dotcom_id, fall back to ACE registration
    final_dotcom_id = coalesce(dotcom_id, ace_dotcom_id, tolong(0)),
    final_userhandle = coalesce(user_handle, ace_userhandle, ""),
    learner_status = case(
        exams_passed >= 4, "Champion",
        exams_passed >= 3, "Specialist",
        exams_passed >= 2, "Multi-Certified",
        exams_passed == 1, "Certified",
        total_exams > 0, "Learning",
        events_registered > 0, "Engaged",
        "Registered"
    ),
    journey_stage = case(
        exams_passed >= 4, "Stage 11: Champion",
        exams_passed >= 3, "Stage 10: Specialist",
        exams_passed >= 2, "Stage 9: Power User",
        exams_passed == 1, "Stage 6: Certified",
        total_exams > 0, "Stage 4: Learning",
        events_registered > 0, "Stage 3: Engaged",
        "Stage 2: Registered"
    )
| project
    email,
    dotcom_id = final_dotcom_id,
    userhandle = final_userhandle,
    first_name,
    last_name,
    job_role,
    // Company sources - exam registration and ACE registration
    exam_company,
    exam_company_type,
    ace_company,
    ace_company_type,
    // Country/region from exam and ACE
    exam_country,
    exam_region,
    ace_country,
    ace_region,
    registration_date,
    total_exams,
    exams_passed,
    first_exam,
    last_exam,
    cert_names,
    exam_codes,
    events_registered,
    first_event,
    last_event,
    learner_status,
    journey_stage
"""

# Query 2: Skills/Learn Page Views from Hydro
# NOTE: This query gets GitHub docs/learning page views - used for skills_page_views
QUERY_2_SKILLS_LEARN = """
// GitHub page views for users who might be learning (looking at docs, actions, etc.)
let github_learning_views = analytics_v0_page_view
    | where timestamp > ago(365d)
    | where page has_any ("docs.github.com", "/actions", "/learning", "/training")
    | extend dotcom_id = tolong(actor_id)
    | where dotcom_id > 0
    | summarize
        github_doc_views = count(),
        first_doc_visit = min(timestamp),
        last_doc_visit = max(timestamp)
    by dotcom_id;

// Output learning views with placeholder columns for consistency
github_learning_views
| project
    dotcom_id,
    skills_page_views = github_doc_views,
    skills_sessions = toint(0),
    first_skills_visit = first_doc_visit,
    last_skills_visit = last_doc_visit
"""

# Query 2C: GitHub Learn (learn.github.com) engagement
QUERY_2C_GITHUB_LEARN = """
// GitHub Learn Engagement (learn.github.com)
// Aggregates page views from learn.github.com by user
// Uses full available timeframe to match certification data (back to FY22)
analytics_v0_page_view
| where app == 'learn'
| where isnotempty(actor_id)
| where timestamp >= datetime(2021-09-01)
| extend path = extract("learn.github.com(/[^?#]*)", 1, page)
| extend content_type = case(
    path has "/certifications" or path has "/certification/", "Certifications",
    path has "/credentials", "Credentials", 
    path has "/learning", "Learning Content",
    path has "/skills", "Skills",
    path has "/profile", "Profile",
    path has "/dashboard", "Dashboard",
    path == "/" or path == "", "Home",
    "Other"
)
| summarize
    learn_page_views = count(),
    learn_sessions = dcount(client_id),
    first_learn_visit = min(timestamp),
    last_learn_visit = max(timestamp),
    content_types_viewed = make_set(content_type),
    viewed_certifications = countif(content_type == "Certifications"),
    viewed_skills = countif(content_type == "Skills"),
    viewed_learning = countif(content_type == "Learning Content")
  by dotcom_id = actor_id
| where learn_page_views > 0
"""

# Query 2B: Skills Users from Hydro - Users who engaged with skills/* repos but aren't in ACE
# This captures users who only did Skills courses (62k+ users)
QUERY_2B_SKILLS_USERS = """
// GitHub Skills Users - authenticated users who viewed skills/* repos
// These are potential learners who started with Skills courses
// Uses full available timeframe to match certification data (back to FY22)
let skills_users = analytics_v0_page_view
    | where repository_nwo startswith "skills/"
    | where isnotempty(actor_id)
    | where timestamp >= datetime(2021-09-01)
    | extend skill_name = tostring(split(repository_nwo, "/")[1])
    | extend skill_category = case(
        skill_name has "copilot" or skill_name has "mcp" or skill_name has "spark", "AI/Copilot",
        skill_name has "action" or skill_name has "workflow", "Actions",
        skill_name has "git" or skill_name has "pull-request" or skill_name has "merge" or skill_name has "github", "Git/GitHub Basics",
        skill_name has "code" or skill_name has "codespace", "Development",
        skill_name has "secure" or skill_name has "security" or skill_name has "codeql", "Security",
        skill_name has "deploy" or skill_name has "azure" or skill_name has "release", "DevOps/Deployment",
        skill_name has "markdown" or skill_name has "page", "Documentation",
        "Other"
    )
    | summarize
        skills_page_views = count(),
        skills_sessions = dcount(client_id),
        first_skills_visit = min(timestamp),
        last_skills_visit = max(timestamp),
        skills_completed = make_set(skill_name, 20),
        skills_count = dcount(skill_name),
        ai_skills_count = dcountif(skill_name, skill_category == "AI/Copilot"),
        actions_skills_count = dcountif(skill_name, skill_category == "Actions"),
        git_skills_count = dcountif(skill_name, skill_category == "Git/GitHub Basics"),
        security_skills_count = dcountif(skill_name, skill_category == "Security")
      by dotcom_id = actor_id
    | where skills_page_views > 0;

// Get user handles for skills users via user_events
let skills_with_handles = skills_users
    | join kind=leftouter (
        github_v1_user_signup
        | extend dotcom_id = tolong(actor.id), userhandle = tolower(tostring(actor.login))
        | where dotcom_id > 0
        | summarize userhandle = take_any(userhandle) by dotcom_id
    ) on dotcom_id
    | project-away dotcom_id1;

skills_with_handles
| project
    dotcom_id,
    userhandle = coalesce(userhandle, ""),
    skills_page_views,
    skills_sessions,
    first_skills_visit,
    last_skills_visit,
    skills_completed,
    skills_count,
    ai_skills_count,
    actions_skills_count,
    git_skills_count,
    security_skills_count
"""

# Query 3: Partner Credentials from CSE Analytics
QUERY_3_PARTNER_CREDS = """
// Get partner credentials - issued certifications through partners
partner_credentials
| where Status == "Completed"
| extend email = tolower(Email)
| where isnotempty(email)
| summarize
    partner_certs = count(),
    partner_cert_names = make_set(['Certification Name'], 10),
    partner_companies = make_set(['Partner Name'], 5),
    first_partner_cert = min(['Certification Completed Date']),
    last_partner_cert = max(['Certification Completed Date'])
by email
"""

# =============================================================================
# OPTIMIZED QUERIES: Pre-fetch learner IDs once, pass to other queries
# This avoids repeating the same ace_ids + skills_ids subqueries 3x
# =============================================================================

# Query to get all learner dotcom_ids (run ONCE, pass result to other queries)
QUERY_LEARNER_IDS = """
// Get ALL learner IDs from ACE + Skills (run once, reuse for all enrichment queries)
// ACE learner IDs
let ace_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id;

// Skills user IDs (from hydro page views of skills/* repos)
// Uses full available timeframe to match certification data (back to FY22)
let skills_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
    | where repository_nwo startswith "skills/"
    | where isnotempty(actor_id)
    | where timestamp >= datetime(2021-09-01)
    | extend dotcom_id = actor_id
    | where dotcom_id > 0
    | distinct dotcom_id;

// Union and return all unique learner IDs
union ace_ids, skills_ids 
| distinct dotcom_id
| project dotcom_id
"""

# Query 4: User Demographics - OPTIMIZED (uses pre-fetched IDs)
# Template with {learner_ids_filter} placeholder
QUERY_4_USER_DEMOGRAPHICS_TEMPLATE = """
// Get user demographics for learners (using pre-fetched IDs for efficiency)
accounts_all
| where account_type == "User"
| where dotcom_id in ({learner_ids_filter})
| summarize arg_max(day, *) by dotcom_id
| project
    dotcom_id,
    country_account,
    account_created_at = created_at,
    is_staff,
    is_spammy,
    is_suspended,
    is_disabled,
    is_paid,
    is_dunning,
    is_education,
    plan,
    billing_type,
    billing_cycle,
    total_arr_in_dollars,
    total_paid_seats,
    total_billable_seats,
    first_paid_date,
    first_paid_plan
"""

# Query 5: Org Enrichment - OPTIMIZED (uses pre-fetched IDs)
QUERY_5_ORG_ENRICHMENT_TEMPLATE = """
// Get org enrichment for learners (using pre-fetched IDs for efficiency)
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

// Get user-to-org relationships
let user_orgs = relationships_all
| where child_type == "User" and parent_type == "Organization"
| where child_dotcom_id in (learner_ids)
| summarize arg_max(day, *) by child_dotcom_id, parent_dotcom_id, parent_global_id;

// Get org details from account_hierarchy_global_all
let org_details = account_hierarchy_global_all
| where account_type == "Organization"
| summarize arg_max(day, *) by account_global_id;

// Join user-org relationships with org details
user_orgs
| join kind=leftouter org_details on $left.parent_global_id == $right.account_global_id
| summarize arg_max(is_paid, *), org_count = count() by child_dotcom_id
| project
    dotcom_id = child_dotcom_id,
    org_dotcom_id = parent_dotcom_id,
    org_name = login,
    org_country = account_country,
    org_is_paid = is_paid,
    org_plan_name = plan_name,
    org_is_emu = enterprise_account_emu_enabled,
    org_enterprise_slug = enterprise_account_slug,
    org_enterprise_id = enterprise_account_id,
    org_customer_id = customer_id,
    org_customer_name = customer_name,
    org_salesforce_account_name = salesforce_account_name,
    org_salesforce_parent_name = salesforce_parent_account_name,
    org_has_enterprise_agreements = has_enterprise_agreements,
    org_count
"""

# Query 7: Product Usage - OPTIMIZED with REDUCED columns for speed
# Fetching 50+ columns is slow; focus on most important metrics
QUERY_7_PRODUCT_USAGE_TEMPLATE = """
// Get product usage for learners (OPTIMIZED: fewer columns, pre-fetched IDs)
// Includes first_use dates for each product to calculate pre-certification usage
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

let d90 = ago(90d);
let d180 = ago(180d);

user_daily_activity_per_product
| where day >= ago(365d)
| where user_id in (learner_ids)
| summarize
    // Copilot - key metrics with first/last use for pre-cert analysis
    copilot_days_90d = dcountif(day, product has "Copilot" and day >= d90),
    copilot_days = dcountif(day, product has "Copilot"),
    copilot_engagement_events = sumif(num_engagement_events, product has "Copilot"),
    copilot_first_use = minif(day, product has "Copilot"),
    copilot_last_use = maxif(day, product has "Copilot"),
    // Actions - with first use date
    actions_days_90d = dcountif(day, product == "Actions" and day >= d90),
    actions_days = dcountif(day, product == "Actions"),
    actions_engagement_events = sumif(num_engagement_events, product == "Actions"),
    actions_first_use = minif(day, product == "Actions"),
    // Security - with first use date
    security_days_90d = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL") and day >= d90),
    security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    security_first_use = minif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    // Core GitHub activity - with first use dates
    pr_days = dcountif(day, product == "Pull Requests"),
    pr_first_use = minif(day, product == "Pull Requests"),
    issues_days = dcountif(day, product == "Issues"),
    issues_first_use = minif(day, product == "Issues"),
    // Overall
    total_active_days_90d = dcountif(day, day >= d90),
    total_active_days = dcount(day),
    total_engagement_events = sum(num_engagement_events),
    first_activity = min(day),
    last_activity = max(day)
by user_id
| extend
    uses_copilot = copilot_days_90d > 0,
    uses_actions = actions_days_90d > 0,
    uses_security = security_days_90d > 0,
    copilot_ever_used = copilot_days > 0,
    actions_ever_used = actions_days > 0,
    security_ever_used = security_days > 0,
    skill_maturity_score = toint(
        case(pr_days > 0, 15, 0) + case(issues_days > 0, 10, 0) +
        case(actions_days > 0, 25, 0) +
        case(copilot_days > 0, 15, 0) + case(security_days > 0, 10, 0)
    )
| project
    dotcom_id = user_id,
    skill_maturity_score,
    copilot_ever_used, actions_ever_used, security_ever_used,
    uses_copilot, uses_actions, uses_security,
    copilot_days_90d, copilot_days, copilot_engagement_events,
    copilot_first_use, copilot_last_use,
    actions_days_90d, actions_days, actions_engagement_events,
    actions_first_use,
    security_days_90d, security_days,
    security_first_use,
    pr_days, pr_first_use,
    issues_days, issues_first_use,
    total_active_days_90d, total_active_days, total_engagement_events,
    first_activity, last_activity
"""

# Legacy queries kept for backwards compatibility
# These are used if pre-fetched IDs aren't available
QUERY_4_USER_DEMOGRAPHICS = """
// Get user demographics for ALL learners (ACE + Skills users)
// ACE learner IDs
let ace_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id;

// Skills user IDs (from hydro page views of skills/* repos)
// Uses full available timeframe to match certification data (back to FY22)
let skills_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
    | where repository_nwo startswith "skills/"
    | where isnotempty(actor_id)
    | where timestamp >= datetime(2021-09-01)
    | extend dotcom_id = actor_id
    | where dotcom_id > 0
    | distinct dotcom_id;

// Union all learner IDs
let learner_ids = union ace_ids, skills_ids | distinct dotcom_id;

accounts_all
| where account_type == "User"
| where dotcom_id in (learner_ids)
| summarize arg_max(day, *) by dotcom_id
| project
    dotcom_id,
    country_account,
    account_created_at = created_at,
    is_staff,
    is_spammy,
    is_suspended,
    is_disabled,
    is_paid,
    is_dunning,
    is_education,
    plan,
    billing_type,
    billing_cycle,
    total_arr_in_dollars,
    total_paid_seats,
    total_billable_seats,
    first_paid_date,
    first_paid_plan
"""

# Query 5: Org Enrichment using account_hierarchy_global_all (canonical unified table)
# Join via global_id which is the key in account_hierarchy_global_all
# Now includes both ACE learners AND Skills users
QUERY_5_ORG_ENRICHMENT = """
// Get org enrichment for ALL learners (ACE + Skills users)
// ACE learner IDs
let ace_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id;

// Skills user IDs
// Uses full available timeframe to match certification data (back to FY22)
let skills_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
    | where repository_nwo startswith "skills/"
    | where isnotempty(actor_id)
    | where timestamp >= datetime(2021-09-01)
    | extend dotcom_id = actor_id
    | where dotcom_id > 0
    | distinct dotcom_id;

// Union all learner IDs
let learner_ids = union ace_ids, skills_ids | distinct dotcom_id;

// Get user-to-org relationships with parent_global_id for joining to account_hierarchy
let user_orgs = relationships_all
| where child_type == "User" and parent_type == "Organization"
| where child_dotcom_id in (learner_ids)
| summarize arg_max(day, *) by child_dotcom_id, parent_dotcom_id, parent_global_id;

// Get org details from account_hierarchy_global_all (unified canonical table)
// This table has: customer_name (billing), salesforce_account_name, enterprise info, etc.
// Join via account_global_id which matches parent_global_id from relationships
let org_details = account_hierarchy_global_all
| where account_type == "Organization"
| summarize arg_max(day, *) by account_global_id;

// Join user-org relationships with org details via global_id
// NOTE: Using leftouter to preserve users whose orgs may not be in account_hierarchy
user_orgs
| join kind=leftouter org_details on $left.parent_global_id == $right.account_global_id
| summarize
    // Take the "best" org (prefer paid, then largest)
    arg_max(is_paid, *),
    org_count = count()
by child_dotcom_id
| project
    dotcom_id = child_dotcom_id,
    org_dotcom_id = parent_dotcom_id,
    org_name = login,
    org_country = account_country,
    org_is_paid = is_paid,
    org_plan_name = plan_name,
    org_is_emu = enterprise_account_emu_enabled,
    org_enterprise_slug = enterprise_account_slug,
    org_enterprise_id = enterprise_account_id,
    // Company attribution fields from account_hierarchy_global_all
    org_customer_id = customer_id,
    org_customer_name = customer_name,  // Billed customer name (most authoritative)
    org_salesforce_account_name = salesforce_account_name,
    org_salesforce_parent_name = salesforce_parent_account_name,
    org_has_enterprise_agreements = has_enterprise_agreements,
    org_count
"""

# Query 6 removed - all company data now in Query 5 via account_hierarchy_global_all

# Query 5B: DIRECT User-level Company Enrichment from account_hierarchy_dotcom_all
# This provides company attribution for users who don't belong to any org
# account_hierarchy_dotcom_all has 131M users with customer_name - join directly on dotcom_id!
QUERY_5B_DIRECT_USER_COMPANY = """
// DIRECT user-level company enrichment from account_hierarchy_dotcom_all
// This captures users who have individual billing/enterprise relationships
// even if they don't belong to any organization

// ACE learner IDs
let ace_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id;

// Skills user IDs
// Uses full available timeframe to match certification data (back to FY22)
let skills_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
    | where repository_nwo startswith "skills/"
    | where isnotempty(actor_id)
    | where timestamp >= datetime(2021-09-01)
    | extend dotcom_id = actor_id
    | where dotcom_id > 0
    | distinct dotcom_id;

// Union all learner IDs
let learner_ids = union ace_ids, skills_ids | distinct dotcom_id;

// Direct lookup in account_hierarchy_dotcom_all (has dotcom_id as key!)
account_hierarchy_dotcom_all
| where account_type == "User"
| where dotcom_id in (learner_ids)
| summarize arg_max(day, *) by dotcom_id
| where isnotempty(customer_name) or isnotempty(salesforce_account_name) or isnotempty(enterprise_account_slug)
| project
    dotcom_id,
    user_customer_name = customer_name,
    user_salesforce_account_name = salesforce_account_name,
    user_salesforce_parent_name = salesforce_parent_account_name,
    user_enterprise_slug = enterprise_account_slug,
    user_enterprise_id = enterprise_account_id,
    user_is_emu = enterprise_account_emu_enabled,
    user_country = account_country,
    user_is_paid = is_paid,
    user_plan_name = plan_name,
    user_customer_id = customer_id
"""

# Query 7: Product Usage from user_daily_activity_per_product
# OPTIMIZED: Reduced columns, simpler aggregations to prevent timeouts
# Captures 10 products with 90-day and 365-day windows
# Skill maturity calculated in Python post-processing for reliability
QUERY_7_PRODUCT_USAGE = """
// Get product usage for ALL learners (ACE + Skills users) - OPTIMIZED
// ACE learner IDs
let ace_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id;

// Skills user IDs (simplified - only recent)
let skills_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
    | where repository_nwo startswith "skills/"
    | where isnotempty(actor_id) and actor_id > 0
    | where timestamp >= ago(365d)
    | distinct actor_id
    | project dotcom_id = actor_id;

// Union all learner IDs
let learner_ids = union ace_ids, skills_ids | distinct dotcom_id;

// Time window boundary
let d90 = ago(90d);

user_daily_activity_per_product
| where day >= ago(365d)
| where user_id in (learner_ids)
| summarize
    // Core products with 90d + 365d windows
    copilot_days_90d = dcountif(day, product has "Copilot" and day >= d90),
    copilot_days = dcountif(day, product has "Copilot"),
    copilot_events = sumif(num_engagement_events, product has "Copilot"),
    actions_days_90d = dcountif(day, product == "Actions" and day >= d90),
    actions_days = dcountif(day, product == "Actions"),
    actions_events = sumif(num_engagement_events, product == "Actions"),
    security_days_90d = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL") and day >= d90),
    security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    // Additional products - 365d window only for performance
    pr_days = dcountif(day, product == "Pull Requests"),
    issues_days = dcountif(day, product == "Issues"),
    code_search_days = dcountif(day, product == "Code Search"),
    packages_days = dcountif(day, product == "Packages"),
    projects_days = dcountif(day, product == "Projects"),
    discussions_days = dcountif(day, product == "Discussions"),
    pages_days = dcountif(day, product == "Pages"),
    // Overall activity
    total_active_days_90d = dcountif(day, day >= d90),
    total_active_days = dcount(day),
    total_events = sum(num_engagement_events),
    first_activity = min(day),
    last_activity = max(day),
    // First use dates for pre-certification tracking
    copilot_first_use = minif(day, product has "Copilot"),
    actions_first_use = minif(day, product == "Actions"),
    security_first_use = minif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    pr_first_use = minif(day, product == "Pull Requests"),
    issues_first_use = minif(day, product == "Issues")
by user_id
| project
    dotcom_id = user_id,
    // Usage flags (90-day)
    uses_copilot = copilot_days_90d > 0,
    uses_actions = actions_days_90d > 0,
    uses_security = security_days_90d > 0,
    // Ever used flags (365-day)
    copilot_ever_used = copilot_days > 0,
    actions_ever_used = actions_days > 0,
    security_ever_used = security_days > 0,
    pr_ever_used = pr_days > 0,
    issues_ever_used = issues_days > 0,
    code_search_ever_used = code_search_days > 0,
    packages_ever_used = packages_days > 0,
    projects_ever_used = projects_days > 0,
    discussions_ever_used = discussions_days > 0,
    pages_ever_used = pages_days > 0,
    // Day counts
    copilot_days_90d,
    copilot_days,
    copilot_engagement_events = copilot_events,
    actions_days_90d,
    actions_days,
    actions_engagement_events = actions_events,
    security_days_90d,
    security_days,
    pr_days,
    issues_days,
    code_search_days,
    packages_days,
    projects_days,
    discussions_days,
    pages_days,
    total_active_days_90d,
    total_active_days,
    total_engagement_events = total_events,
    first_activity,
    last_activity,
    // First use dates for pre-certification tracking
    copilot_first_use,
    actions_first_use,
    security_first_use,
    pr_first_use,
    issues_first_use
"""

# Query 7B: Pre-Certification Product Usage
# Calculates product usage in the 90 days BEFORE each learner's first certification
# Joins product activity with exam dates to isolate pre-certification behavior
QUERY_7B_PRECERT_USAGE = """
// Pre-certification product usage - 90 days before first exam
// OPTIMIZED: Use broadcast join with pre-aggregated exam dates
// Strategy: Materialize exam dates first, then broadcast to filter product data

// Step 1: Get exam dates (small table ~65k rows)
let certified_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id;

// Step 2: Get product activity for certified users only, using broadcast hint
// Only get data from the 90-day window before each user's exam
user_daily_activity_per_product
| where user_id > 0
| lookup kind=inner (certified_users) on $left.user_id == $right.dotcom_id
| where day < first_exam and day >= datetime_add('day', -90, first_exam)
| summarize
    copilot_days_precert = dcountif(day, product has "Copilot"),
    actions_days_precert = dcountif(day, product == "Actions"),
    security_days_precert = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    pr_days_precert = dcountif(day, product == "Pull Requests"),
    issues_days_precert = dcountif(day, product == "Issues"),
    code_search_days_precert = dcountif(day, product == "Code Search"),
    packages_days_precert = dcountif(day, product == "Packages"),
    projects_days_precert = dcountif(day, product == "Projects"),
    discussions_days_precert = dcountif(day, product == "Discussions"),
    pages_days_precert = dcountif(day, product == "Pages"),
    total_active_days_precert = dcount(day),
    total_events_precert = sum(num_engagement_events)
by dotcom_id
| project
    dotcom_id,
    used_copilot_precert = copilot_days_precert > 0,
    used_actions_precert = actions_days_precert > 0,
    used_security_precert = security_days_precert > 0,
    used_pr_precert = pr_days_precert > 0,
    used_issues_precert = issues_days_precert > 0,
    copilot_days_precert,
    actions_days_precert,
    security_days_precert,
    pr_days_precert,
    issues_days_precert,
    code_search_days_precert,
    packages_days_precert,
    projects_days_precert,
    discussions_days_precert,
    pages_days_precert,
    total_active_days_precert,
    total_events_precert,
    products_used_precert = toint(copilot_days_precert > 0) + toint(actions_days_precert > 0) + 
                            toint(security_days_precert > 0) + toint(pr_days_precert > 0) + 
                            toint(issues_days_precert > 0) + toint(code_search_days_precert > 0) +
                            toint(packages_days_precert > 0) + toint(projects_days_precert > 0) +
                            toint(discussions_days_precert > 0) + toint(pages_days_precert > 0)
"""

# =============================================================================
# NEW QUERIES: Repository Activity, MEU, Browser Events, Actions Engagement
# Based on github/data documentation for additional data sources
# =============================================================================

# Query 8: Repository Activity - Track repos learners contribute to
# Source: canonical.repositories_current
# Data Dot: https://data.githubapp.com/warehouse/hive/canonical/repositories_current
QUERY_8_REPO_ACTIVITY_TEMPLATE = """
// Repository Activity for Learners
// Tracks what repositories learners own/contribute to
// Uses repositories_current canonical table
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

repositories_current
| where owner_id in (learner_ids)
| summarize 
    repos_owned = count(),
    public_repos = countif(visibility == "public"),
    private_repos = countif(visibility == "private"),
    languages = make_set(primary_language, 10),
    total_stars = sum(stargazers_count),
    total_forks = sum(forks_count),
    newest_repo = max(created_at),
    last_push = max(pushed_at),
    has_actions = countif(has_workflow_files)
by owner_id
| project
    dotcom_id = owner_id,
    repos_owned,
    public_repos,
    private_repos,
    languages,
    total_stars,
    total_forks,
    newest_repo,
    last_push,
    repos_with_actions = has_actions,
    is_oss_contributor = public_repos > 0
"""

# Query 9: MEU (Monthly Enrolled Users) Tracking
# Source: canonical.metric_enrollments
# Data Dot: https://data.githubapp.com/warehouse/hive/canonical/metric_enrollments
# MEU is a key enterprise activation metric
QUERY_9_MEU_TRACKING_TEMPLATE = """
// MEU (Monthly Enrolled Users) Tracking for Learners
// Measures enterprise activation - key business metric
// Uses metric_enrollments canonical table
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

metric_enrollments
| where metric == "meu"
| where dotcom_id in (learner_ids)
| summarize 
    meu_qualified = countif(qualified == true) > 0,
    meu_months_qualified = dcountif(day, qualified == true),
    first_meu_qualified = minif(day, qualified == true),
    last_meu_qualified = maxif(day, qualified == true),
    products_contributing = make_set(product, 10)
by dotcom_id
| project
    dotcom_id,
    is_meu_qualified = meu_qualified,
    meu_months_qualified,
    first_meu_qualified,
    last_meu_qualified,
    meu_products = products_contributing
"""

# Query 10: Browser Events for Click Tracking
# Source: hydro.analytics_v0_browser_event
# Goes beyond page views to understand actual engagement depth
QUERY_10_BROWSER_EVENTS_TEMPLATE = """
// Browser Event Tracking for Learners
// Captures clicks, time on page, and engagement beyond page views
// Uses analytics_v0_browser_event hydro table
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

analytics_v0_browser_event
| where timestamp > ago(90d)
| where actor_id in (learner_ids)
| where context_app in ("skills", "learn", "docs")
| summarize
    total_clicks = count(),
    unique_sessions = dcount(client_id),
    avg_engagement_time_ms = avg(engagement_time_msec),
    skills_clicks = countif(context_app == "skills"),
    learn_clicks = countif(context_app == "learn"),
    docs_clicks = countif(context_app == "docs"),
    first_event = min(timestamp),
    last_event = max(timestamp)
by actor_id
| project
    dotcom_id = actor_id,
    total_browser_events = total_clicks,
    browser_sessions = unique_sessions,
    avg_engagement_seconds = toint(avg_engagement_time_ms / 1000),
    skills_clicks,
    learn_clicks,
    docs_clicks,
    first_browser_event = first_event,
    last_browser_event = last_event
"""

# Query 11: GitHub Activity Metrics (Commits, PRs, Issues)
# Correlates learning with actual GitHub engagement
# Uses user_daily_activity_per_product or github_v1_request
QUERY_11_GITHUB_ACTIVITY_TEMPLATE = """
// GitHub Activity Metrics for Learners
// Tracks commits, PRs, issues to correlate with learning
// Uses user_daily_activity_per_product canonical table
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

let d30 = ago(30d);
let d90 = ago(90d);

user_daily_activity_per_product
| where day >= ago(365d)
| where user_id in (learner_ids)
| where product in ("Pull Requests", "Issues", "Commits", "Code Review")
| summarize
    // 30-day activity
    prs_30d = dcountif(day, product == "Pull Requests" and day >= d30),
    issues_30d = dcountif(day, product == "Issues" and day >= d30),
    commits_30d = sumif(num_engagement_events, product == "Commits" and day >= d30),
    reviews_30d = dcountif(day, product == "Code Review" and day >= d30),
    // 90-day activity
    prs_90d = dcountif(day, product == "Pull Requests" and day >= d90),
    issues_90d = dcountif(day, product == "Issues" and day >= d90),
    commits_90d = sumif(num_engagement_events, product == "Commits" and day >= d90),
    reviews_90d = dcountif(day, product == "Code Review" and day >= d90),
    // Total activity
    total_pr_days = dcountif(day, product == "Pull Requests"),
    total_issue_days = dcountif(day, product == "Issues"),
    total_commit_events = sumif(num_engagement_events, product == "Commits"),
    total_review_days = dcountif(day, product == "Code Review"),
    first_contribution = min(day),
    last_contribution = max(day)
by user_id
| extend
    activity_score = prs_90d * 3 + issues_90d * 2 + toint(commits_90d / 10) + reviews_90d * 2,
    is_active_contributor = prs_30d > 0 or commits_30d > 5
| project
    dotcom_id = user_id,
    prs_30d, issues_30d, commits_30d, reviews_30d,
    prs_90d, issues_90d, commits_90d, reviews_90d,
    total_pr_days, total_issue_days, total_commit_events, total_review_days,
    first_contribution, last_contribution,
    github_activity_score = activity_score,
    is_active_contributor
"""

# Query 12: Actions Engagement Levels
# Source: scratch_data_science.actions_engagement_repo (via Trino/Kusto snapshot)
# Documentation: /github/data/team-docs/trust_compute_data/docs/how_to_guides/actions_engagement_metric_user_guide.md
# 
# Actions engagement levels (0-5) are data-driven based on clustering:
#   Level 0: No Actions usage
#   Level 1: 1-4 days usage in L28, 1+ workflow executions
#   Level 2: 5-9 days usage in L28, 1+ workflow executions  
#   Level 3: 10-17 days usage in L28, 1+ workflow executions
#   Level 4: 18+ days usage in L28, 1-59 workflow executions
#   Level 5: 18+ days usage in L28, 60+ workflow executions (power users)
#
# This query calculates per-user Actions engagement based on repo ownership
QUERY_12_ACTIONS_ENGAGEMENT_TEMPLATE = """
// Actions Engagement Levels for Learners
// Calculates engagement level (0-5) based on workflow activity
// Pattern from github/data actions engagement metric
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

// Get workflow activity for repos owned by learners
let repo_activity = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').github_v1_request
    | where timestamp >= ago(28d)
    | where request_category == "check_runs" or request_category == "workflow_runs"
    | where actor_id in (learner_ids)
    | extend day = startofday(timestamp)
    | summarize 
        workflow_executions = count(),
        days_with_activity = dcount(day)
      by actor_id
    | extend
        // Calculate Actions engagement level (0-5) per documentation
        actions_engagement_level = case(
            workflow_executions == 0 or days_with_activity == 0, 0,
            days_with_activity <= 4, 1,
            days_with_activity <= 9, 2,
            days_with_activity <= 17, 3,
            days_with_activity >= 18 and workflow_executions < 60, 4,
            days_with_activity >= 18 and workflow_executions >= 60, 5,
            0
        );

// Return engagement data
repo_activity
| project
    dotcom_id = actor_id,
    actions_engagement_level,
    actions_workflow_executions_l28 = workflow_executions,
    actions_days_with_activity_l28 = days_with_activity,
    actions_is_power_user = actions_engagement_level >= 4
"""

# Query 13: Copilot Adoption Lifecycle
# Tracks trial → paid conversion and usage patterns
# Based on github/data copilot data definitions
QUERY_13_COPILOT_LIFECYCLE_TEMPLATE = """
// Copilot Adoption Lifecycle for Learners
// Tracks subscription status, trial conversion, IDE usage
// Based on copilot data definitions from github/data
let learner_ids = datatable(dotcom_id: long) [{learner_ids_filter}];

// Get Copilot subscription info from hydro
let copilot_subs = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').github_copilot_v1_copilot_signup_subscription_created
    | where actor_id in (learner_ids)
    | summarize 
        subscription_date = min(timestamp),
        is_subscribed = any(subscription_status == "active")
      by actor_id = actor_id;

// Get Copilot token generation (usage patterns by IDE)
let copilot_usage = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').github_copilot_v0_copilot_token_generated
    | where timestamp >= ago(90d)
    | where actor_id in (learner_ids)
    | extend 
        ide_name = case(
            editor_version startswith "vsc", "VSCode",
            editor_version startswith "vs/", "VisualStudio",
            editor_version startswith "JetBrains", "JetBrains",
            editor_version startswith "neovim", "Neovim",
            editor_version startswith "vim", "Vim",
            editor_version startswith "Xcode", "Xcode",
            isempty(editor_version), "Unknown",
            "Other"
        )
    | summarize
        total_tokens = count(),
        active_days = dcount(startofday(timestamp)),
        ides_used = make_set(ide_name, 5),
        primary_ide = take_any(ide_name),
        first_use = min(timestamp),
        last_use = max(timestamp)
      by actor_id;

// Join subscription and usage data
copilot_subs
| join kind=leftouter copilot_usage on actor_id
| project
    dotcom_id = actor_id,
    copilot_subscription_date = subscription_date,
    copilot_is_subscribed = coalesce(is_subscribed, false),
    copilot_total_tokens_90d = coalesce(total_tokens, 0),
    copilot_active_days_90d = coalesce(active_days, 0),
    copilot_ides = coalesce(ides_used, dynamic([])),
    copilot_primary_ide = coalesce(primary_ide, ""),
    copilot_first_use = first_use,
    copilot_last_use = last_use,
    copilot_is_active = coalesce(active_days, 0) > 0
"""


def derive_region(country: str) -> str:
    """Derive region from country code."""
    if pd.isna(country) or not country:
        return "Unknown"
    return COUNTRY_TO_REGION.get(country.upper(), "Other")


# ==========================================================================
# Email Domain to Company Mapping
# Maps corporate email domains to company names for attribution
# ==========================================================================

# Personal/free email domains to exclude
PERSONAL_EMAIL_DOMAINS = {
    'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
    'icloud.com', 'live.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me',
    'mail.com', 'msn.com', 'ymail.com', 'qq.com', '163.com', '126.com', 'naver.com',
    'hotmail.co.uk', 'yahoo.co.uk', 'outlook.de', 'web.de', 'gmx.de', 'gmx.net',
    'yahoo.co.in', 'outlook.es', 'outlook.fr', 'outlook.jp', 'yahoo.com.br',
    'pm.me', 'tutanota.com', 'zoho.com', 'fastmail.com', 'hey.com'
}

# Domain to company name mapping for common domains
DOMAIN_TO_COMPANY = {
    'accenture.com': 'Accenture',
    'microsoft.com': 'Microsoft',
    'cognizant.com': 'Cognizant',
    'tcs.com': 'Tata Consultancy Services',
    'infosys.com': 'Infosys',
    'capgemini.com': 'Capgemini',
    'hcltech.com': 'HCL Technologies',
    'wipro.com': 'Wipro',
    'ltimindtree.com': 'LTIMindtree',
    'techmahindra.com': 'Tech Mahindra',
    'ust.com': 'UST',
    'ust-global.com': 'UST',
    'ibm.com': 'IBM',
    'deloitte.com': 'Deloitte',
    'ey.com': 'EY',
    'gds.ey.com': 'EY',
    'in.ey.com': 'EY',
    'kpmg.com': 'KPMG',
    'pwc.com': 'PwC',
    'avanade.com': 'Avanade',
    'slalom.com': 'Slalom',
    'globallogic.com': 'GlobalLogic',
    'epam.com': 'EPAM',
    'kyndryl.com': 'Kyndryl',
    'cgi.com': 'CGI',
    'nttdata.com': 'NTT DATA',
    'china.nttdata.com': 'NTT DATA',
    'emeal.nttdata.com': 'NTT DATA',
    'hitachi.com': 'Hitachi',
    'hitachi-solutions.com': 'Hitachi Solutions',
    'coforge.com': 'Coforge',
    'nashtechglobal.com': 'NashTech',
    'sogeti.com': 'Sogeti',
    'hcl.com': 'HCL',
    'eficode.com': 'Eficode',
    'softwareone.com': 'SoftwareOne',
    'github.com': 'GitHub',
    'google.com': 'Google',
    'amazon.com': 'Amazon',
    'aws.amazon.com': 'Amazon Web Services',
    'apple.com': 'Apple',
    'facebook.com': 'Meta',
    'meta.com': 'Meta',
    'netflix.com': 'Netflix',
    'salesforce.com': 'Salesforce',
    'oracle.com': 'Oracle',
    'sap.com': 'SAP',
    'vmware.com': 'VMware',
    'redhat.com': 'Red Hat',
    'cisco.com': 'Cisco',
    'intel.com': 'Intel',
    'nvidia.com': 'NVIDIA',
    'adobe.com': 'Adobe',
    'atlassian.com': 'Atlassian',
    'slack.com': 'Slack',
    'uber.com': 'Uber',
    'airbnb.com': 'Airbnb',
    'stripe.com': 'Stripe',
    'shopify.com': 'Shopify',
    'twilio.com': 'Twilio',
    'datadog.com': 'Datadog',
    'hashicorp.com': 'HashiCorp',
    'mongodb.com': 'MongoDB',
    'elastic.co': 'Elastic',
    'snowflake.com': 'Snowflake',
    'databricks.com': 'Databricks',
}

def extract_company_from_email(email: str) -> str:
    """
    Extract company name from corporate email domain.
    Returns empty string for personal emails or if extraction fails.
    """
    if pd.isna(email) or not isinstance(email, str) or '@' not in email:
        return ""
    
    try:
        domain = email.split('@')[1].lower().strip()
    except:
        return ""
    
    # Skip personal email domains
    if domain in PERSONAL_EMAIL_DOMAINS:
        return ""
    
    # Skip educational domains
    if '.edu' in domain or domain.endswith('.ac.uk') or domain.endswith('.edu.br'):
        return ""
    
    # Check explicit mapping first
    if domain in DOMAIN_TO_COMPANY:
        return DOMAIN_TO_COMPANY[domain]
    
    # For other corporate domains, derive company name from domain
    # E.g., "company.com" -> "Company"
    base_domain = domain.split('.')[0]
    
    # Skip if too short or looks like a country subdomain
    if len(base_domain) < 3:
        return ""
    
    # Title case the domain name as company name
    return base_domain.title()


def resolve_company_vectorized(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """
    VECTORIZED company resolution - 10-100x faster than row-by-row apply().
    
    Resolves company name using account_hierarchy data and user-reported data.
    Priority order (most authoritative to least):
    1a. org_customer_name (org-level billing customer - most authoritative)
    1b. user_customer_name (user-level billing from account_hierarchy_dotcom_all)
    2a. org_salesforce_account_name (org-level CRM account)
    2b. user_salesforce_account_name (user-level CRM account)
    3.  salesforce_parent_account_name (CRM parent)
    4.  exam_company (self-reported at certification exam)
    5.  ace_company (self-reported at ACE registration)
    6.  org_name (GitHub org login as fallback)
    7.  partner_credential (training partner - low priority, not the employer)
    8.  email_domain (extracted from corporate email - lowest)
    
    Returns (company_name Series, company_source Series)
    """
    n = len(df)
    company_name = pd.Series([""] * n, index=df.index)
    company_source = pd.Series(["none"] * n, index=df.index)
    
    # Process in reverse priority order (later assignments win)
    # This is much faster than row-by-row conditionals
    
    # Tier 8: Email domain extraction (lowest priority - catches stragglers)
    if "email" in df.columns:
        email_companies = df["email"].apply(extract_company_from_email)
        mask = email_companies != ""
        company_name = company_name.where(~mask, email_companies)
        company_source = company_source.where(~mask, "email_domain")
    
    # Tier 7: Partner company (training partner name - low priority since it's not the employer)
    # Partner companies are certification partners like FastLane, Global Knowledge, etc.
    # These should be overridden by user-reported employer data
    if "partner_companies" in df.columns:
        def extract_first_company(val):
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return ""
            if isinstance(val, (list, np.ndarray)) and len(val) > 0:
                return str(val[0])
            return ""
        partner_first = df["partner_companies"].apply(extract_first_company)
        mask = partner_first != ""
        company_name = company_name.where(~mask, partner_first)
        company_source = company_source.where(~mask, "partner_credential")
    
    # Tier 6: GitHub org name (fallback)
    if "org_name" in df.columns:
        mask = df["org_name"].notna() & (df["org_name"] != "")
        company_name = company_name.where(~mask, df["org_name"])
        company_source = company_source.where(~mask, "org_name")
    
    # Tier 5: ACE company (self-reported at ACE registration)
    if "ace_company" in df.columns:
        mask = df["ace_company"].notna() & (df["ace_company"] != "")
        company_name = company_name.where(~mask, df["ace_company"])
        company_source = company_source.where(~mask, "ace_registration")
    
    # Tier 4: Exam company (self-reported at certification exam)
    if "exam_company" in df.columns:
        mask = df["exam_company"].notna() & (df["exam_company"] != "")
        company_name = company_name.where(~mask, df["exam_company"])
        company_source = company_source.where(~mask, "exam_registration")
    
    # Tier 3: Salesforce parent account (org-level)
    if "org_salesforce_parent_name" in df.columns:
        mask = df["org_salesforce_parent_name"].notna() & (df["org_salesforce_parent_name"] != "")
        company_name = company_name.where(~mask, df["org_salesforce_parent_name"])
        company_source = company_source.where(~mask, "salesforce_parent")
    
    # Tier 2c: User-level Salesforce parent (from account_hierarchy_dotcom_all)
    if "user_salesforce_parent_name" in df.columns:
        mask = df["user_salesforce_parent_name"].notna() & (df["user_salesforce_parent_name"] != "")
        company_name = company_name.where(~mask, df["user_salesforce_parent_name"])
        company_source = company_source.where(~mask, "user_salesforce_parent")
    
    # Tier 2b: User-level Salesforce account (from account_hierarchy_dotcom_all)
    if "user_salesforce_account_name" in df.columns:
        mask = df["user_salesforce_account_name"].notna() & (df["user_salesforce_account_name"] != "")
        company_name = company_name.where(~mask, df["user_salesforce_account_name"])
        company_source = company_source.where(~mask, "user_salesforce_account")
    
    # Tier 2a: Org-level Salesforce account
    if "org_salesforce_account_name" in df.columns:
        mask = df["org_salesforce_account_name"].notna() & (df["org_salesforce_account_name"] != "")
        company_name = company_name.where(~mask, df["org_salesforce_account_name"])
        company_source = company_source.where(~mask, "salesforce_account")
    
    # Tier 1b: User-level billing customer (from account_hierarchy_dotcom_all direct lookup)
    # This captures users with individual billing relationships even if not in any org
    if "user_customer_name" in df.columns:
        mask = df["user_customer_name"].notna() & (df["user_customer_name"] != "")
        company_name = company_name.where(~mask, df["user_customer_name"])
        company_source = company_source.where(~mask, "user_billing_customer")
    
    # Tier 1a: Org-level billing customer (highest priority - wins)
    if "org_customer_name" in df.columns:
        mask = df["org_customer_name"].notna() & (df["org_customer_name"] != "")
        company_name = company_name.where(~mask, df["org_customer_name"])
        company_source = company_source.where(~mask, "billing_customer")
    
    return company_name, company_source


def resolve_country_vectorized(df: pd.DataFrame) -> pd.Series:
    """
    VECTORIZED country resolution - 10-100x faster than row-by-row apply().
    
    Priority order:
    1. accounts_all country (verified account setting)
    2. Org country (from org enrichment)
    3. Exam country (self-reported at exam time)
    4. ACE registration country (self-reported at registration)
    5. Countries from product usage activity
    """
    n = len(df)
    country = pd.Series([""] * n, index=df.index)
    
    # Process in reverse priority order (later assignments win)
    
    # Tier 5: Product usage countries (extract first from list)
    if "countries_active" in df.columns:
        def extract_first_country(val):
            if val is None or (isinstance(val, float) and pd.isna(val)):
                return ""
            if isinstance(val, (list, np.ndarray)) and len(val) > 0:
                return str(val[0]).strip()
            if isinstance(val, str) and val.strip():
                return val.strip()
            return ""
        countries_first = df["countries_active"].apply(extract_first_country)
        mask = countries_first != ""
        country = country.where(~mask, countries_first)
    
    # Tier 4: ACE registration country
    if "ace_country" in df.columns:
        mask = df["ace_country"].notna() & (df["ace_country"].astype(str).str.strip() != "")
        country = country.where(~mask, df["ace_country"].astype(str).str.strip())
    
    # Tier 3: Exam country
    if "exam_country" in df.columns:
        mask = df["exam_country"].notna() & (df["exam_country"].astype(str).str.strip() != "")
        country = country.where(~mask, df["exam_country"].astype(str).str.strip())
    
    # Tier 2: Org country
    if "org_country" in df.columns:
        mask = df["org_country"].notna() & (df["org_country"].astype(str).str.strip() != "")
        country = country.where(~mask, df["org_country"].astype(str).str.strip())
    
    # Tier 1: Account country (highest priority)
    if "country_account" in df.columns:
        mask = df["country_account"].notna() & (df["country_account"].astype(str).str.strip() != "")
        country = country.where(~mask, df["country_account"].astype(str).str.strip())
    
    return country


# Legacy row-by-row functions kept for compatibility
def resolve_company(row: pd.Series) -> tuple:
    """Legacy row-by-row company resolution. Use resolve_company_vectorized() for better performance."""
    # Tier 1: Billed customer name
    if pd.notna(row.get("org_customer_name")) and row.get("org_customer_name"):
        return row["org_customer_name"], "billing_customer"
    # Tier 2: Salesforce account name
    if pd.notna(row.get("org_salesforce_account_name")) and row.get("org_salesforce_account_name"):
        return row["org_salesforce_account_name"], "salesforce_account"
    # Tier 3: Salesforce parent account name
    if pd.notna(row.get("org_salesforce_parent_name")) and row.get("org_salesforce_parent_name"):
        return row["org_salesforce_parent_name"], "salesforce_parent"
    # Tier 4: Partner company
    partner_companies = row.get("partner_companies")
    if partner_companies is not None:
        if isinstance(partner_companies, (list, np.ndarray)) and len(partner_companies) > 0:
            return str(partner_companies[0]), "partner_credential"
    # Tier 5: Exam company
    if pd.notna(row.get("exam_company")) and row.get("exam_company"):
        return row["exam_company"], "exam_registration"
    # Tier 6: ACE company
    if pd.notna(row.get("ace_company")) and row.get("ace_company"):
        return row["ace_company"], "ace_registration"
    # Tier 7: GitHub org name
    if pd.notna(row.get("org_name")) and row.get("org_name"):
        return row["org_name"], "org_name"
    return "", "none"


def resolve_country(row: pd.Series) -> str:
    """Legacy row-by-row country resolution. Use resolve_country_vectorized() for better performance."""
    if "country_account" in row and pd.notna(row["country_account"]) and str(row["country_account"]).strip():
        return str(row["country_account"]).strip()
    if "org_country" in row and pd.notna(row["org_country"]) and str(row["org_country"]).strip():
        return str(row["org_country"]).strip()
    if "exam_country" in row and pd.notna(row["exam_country"]) and str(row["exam_country"]).strip():
        return str(row["exam_country"]).strip()
    if "ace_country" in row and pd.notna(row["ace_country"]) and str(row["ace_country"]).strip():
        return str(row["ace_country"]).strip()
    if "countries_active" in row:
        countries = row["countries_active"]
        if countries is not None:
            if isinstance(countries, (list, np.ndarray)) and len(countries) > 0:
                return str(countries[0]).strip()
            elif isinstance(countries, str) and countries.strip():
                return countries.strip()
    return ""


def main():
    parser = argparse.ArgumentParser(description="Sync enriched learner data")
    parser.add_argument("--full", action="store_true", help="Force full refresh (ignore cache)")
    parser.add_argument("--dry-run", action="store_true", help="Show queries without executing")
    parser.add_argument("--use-cache", action="store_true", help="Use cached data when available (faster)")
    parser.add_argument("--clear-cache", action="store_true", help="Clear all cached data before sync")
    parser.add_argument("--cache-only", action="store_true", help="Only use cached data, skip queries")
    args = parser.parse_args()
    
    # Handle cache clearing
    if args.clear_cache:
        if CACHE_DIR.exists():
            import shutil
            shutil.rmtree(CACHE_DIR)
            log("Cache cleared", "success")
    
    force_refresh = args.full or not args.use_cache

    log("Starting Comprehensive Learner Enrichment Sync", "start")
    log(f"Output: {OUTPUT_FILE}", "info")
    log(f"Mode: {'FULL REFRESH' if force_refresh else 'INCREMENTAL (with cache)'}", "info")

    if args.dry_run:
        log("DRY RUN MODE - Showing queries only", "warning")
        print("\n=== Query 1: ACE Learners ===")
        print(QUERY_1_ACE_LEARNERS[:500] + "...")
        print("\n=== Query 2B: Skills Users (for base population) ===")
        print(QUERY_2B_SKILLS_USERS[:500] + "...")
        print("\n=== Query 4: User Demographics ===")
        print(QUERY_4_USER_DEMOGRAPHICS[:500] + "...")
        print("\n=== Query 5: Org Enrichment (Template) ===")
        print(QUERY_5_ORG_ENRICHMENT_TEMPLATE[:500] + "...")
        print("\n=== Query 7: Product Usage (Template - Optimized) ===")
        print(QUERY_7_PRODUCT_USAGE_TEMPLATE[:500] + "...")
        return

    # Initialize clients (skip if cache-only mode)
    if args.cache_only:
        log("CACHE-ONLY MODE - Loading from cache...", "warning")
        gh_client = None
        cse_client = None
    else:
        log("Connecting to Kusto clusters...", "info")
        gh_client = get_kusto_client(GH_CLUSTER)
        cse_client = get_kusto_client(CSE_CLUSTER)

        if not gh_client:
            log("Failed to connect to GH Analytics cluster", "error")
            sys.exit(1)

        if not cse_client:
            log("CSE client not available - cannot query FY26 data", "error")
            sys.exit(1)

    # ==========================================================================
    # Execute queries with CACHING + PARALLEL execution
    # - Use cache for stable data (demographics, org enrichment)
    # - Re-fetch volatile data (usage, learning activity)
    # ==========================================================================
    sync_start = datetime.now()
    
    # Query 1: ACE Learners - always fresh (base population)
    log("Query 1: ACE Learners (base population)...", "start")
    if args.cache_only and is_cache_valid("ace_learners", False):
        df_ace = load_from_cache("ace_learners")
    else:
        df_ace = execute_query_with_cache(cse_client, "ACE", QUERY_1_ACE_LEARNERS, "ace_learners", force_refresh)
    
    if df_ace is None or df_ace.empty:
        log("Failed to get ACE learners - cannot continue", "error")
        sys.exit(1)
    update_sync_status("ace_learners", "success", len(df_ace))
    learners_with_id = len(df_ace[df_ace["dotcom_id"] > 0])
    log(f"Found {learners_with_id:,} learners with dotcom_id", "info")

    # Determine which queries need refreshing vs can use cache
    queries_to_run = []
    cached_results = {}
    
    # NOTE: Skills/Learn query removed - was returning 8M rows due to overly broad filter
    # Skills Users (QUERY_2B) already provides skills_page_views for actual skills learners
    query_configs = [
        ("GitHub Learn", gh_client, "hydro", QUERY_2C_GITHUB_LEARN, "github_learn"),
        ("Skills Users", gh_client, "hydro", QUERY_2B_SKILLS_USERS, "skills_users"),
        ("Demographics", gh_client, "canonical", QUERY_4_USER_DEMOGRAPHICS, "demographics"),
        ("Org Enrichment", gh_client, "canonical", QUERY_5_ORG_ENRICHMENT, "org_enrichment"),
        ("User Company", gh_client, "canonical", QUERY_5B_DIRECT_USER_COMPANY, "user_company"),
        ("Product Usage", gh_client, "canonical", QUERY_7_PRODUCT_USAGE, "product_usage"),
        ("Pre-Cert Usage", gh_client, "canonical", QUERY_7B_PRECERT_USAGE, "precert_usage"),
        ("Partner Creds", cse_client, "ACE", QUERY_3_PARTNER_CREDS, "partner_creds"),
    ]
    
    for display_name, client, db, query, cache_key in query_configs:
        if not force_refresh and is_cache_valid(cache_key, False):
            # Load from cache
            cached = load_from_cache(cache_key)
            if cached is not None:
                cached_results[display_name] = cached
                continue
        # Need to run query
        if not args.cache_only:
            queries_to_run.append((client, db, query, display_name))
    
    # Execute remaining queries in parallel
    if queries_to_run:
        log(f"Running {len(queries_to_run)} queries ({len(cached_results)} loaded from cache)...", "start")
        fresh_results = execute_queries_parallel(queries_to_run, max_workers=4)
        
        # Save fresh results to cache
        cache_key_map = {cfg[0]: cfg[4] for cfg in query_configs}
        for display_name, df in fresh_results.items():
            if df is not None and not df.empty:
                cache_key = cache_key_map.get(display_name)
                if cache_key:
                    save_to_cache(cache_key, df)
    else:
        fresh_results = {}
        log(f"All {len(cached_results)} queries loaded from cache!", "success")
    
    # Combine cached and fresh results
    all_results = {**cached_results, **fresh_results}
    
    # Extract results with fallback to empty DataFrame
    # NOTE: df_skills removed - Skills Users provides skills_page_views directly
    df_learn = all_results.get("GitHub Learn") if all_results.get("GitHub Learn") is not None else pd.DataFrame()
    df_skills_users = all_results.get("Skills Users") if all_results.get("Skills Users") is not None else pd.DataFrame()
    df_demographics = all_results.get("Demographics") if all_results.get("Demographics") is not None else pd.DataFrame()
    df_org = all_results.get("Org Enrichment") if all_results.get("Org Enrichment") is not None else pd.DataFrame()
    df_user_company = all_results.get("User Company") if all_results.get("User Company") is not None else pd.DataFrame()
    df_usage = all_results.get("Product Usage") if all_results.get("Product Usage") is not None else pd.DataFrame()
    df_precert_usage = all_results.get("Pre-Cert Usage") if all_results.get("Pre-Cert Usage") is not None else pd.DataFrame()
    df_partner = all_results.get("Partner Creds") if all_results.get("Partner Creds") is not None else pd.DataFrame()
    
    # ==========================================================================
    # Load Trino historical data if available (has longer retention than Kusto)
    # Run scripts/sync-trino-skills.py to generate these files
    # ==========================================================================
    trino_skills, trino_learn = load_trino_historical_data()
    
    # Merge Trino historical data with Kusto data (Trino has priority - longer history)
    if trino_skills is not None and not trino_skills.empty:
        log(f"Using Trino historical skills data ({len(trino_skills):,} users)", "info")
        if df_skills_users.empty:
            df_skills_users = trino_skills
        else:
            # Merge: Trino data takes priority, Kusto fills gaps
            df_skills_users = trino_skills.merge(
                df_skills_users[["dotcom_id"]], 
                on="dotcom_id", 
                how="outer", 
                indicator=True
            )
            # Keep Trino data where available
            df_skills_users = df_skills_users[df_skills_users["_merge"] != "right_only"].drop("_merge", axis=1)
            log(f"  Merged to {len(df_skills_users):,} skills users", "info")
    
    if trino_learn is not None and not trino_learn.empty:
        log(f"Using Trino historical learn data ({len(trino_learn):,} users)", "info")
        if df_learn.empty:
            df_learn = trino_learn
        else:
            # Merge: Trino data takes priority
            df_learn = trino_learn.merge(
                df_learn[["dotcom_id"]], 
                on="dotcom_id", 
                how="outer",
                indicator=True
            )
            df_learn = df_learn[df_learn["_merge"] != "right_only"].drop("_merge", axis=1)
            log(f"  Merged to {len(df_learn):,} learn users", "info")
    
    # Update sync status for each query
    for name, df in [("github_learn", df_learn), 
                     ("skills_users", df_skills_users), ("demographics", df_demographics),
                     ("org_enrichment", df_org), ("user_company", df_user_company),
                     ("product_usage", df_usage), ("partner_creds", df_partner)]:
        if df is not None and not df.empty:
            update_sync_status(name, "success", len(df))
        else:
            update_sync_status(name, "failed" if df is None else "empty", 0)
    
    query_elapsed = (datetime.now() - sync_start).total_seconds()
    log(f"All queries completed in {query_elapsed:.1f}s", "success")

    # ==========================================================================
    # Merge all data sources
    # ==========================================================================
    log("Merging all data sources...", "start")
    merge_start = datetime.now()

    # Start with ACE learners as base
    df = df_ace.copy()
    log(f"Base: {len(df):,} ACE learners", "info")

    # ==========================================================================
    # Add Skills-only users to the base population
    # These are users who engaged with Skills courses but aren't in ACE
    # ==========================================================================
    if not df_skills_users.empty:
        # Find Skills users who are NOT already in ACE learners (by dotcom_id)
        existing_ids = set(df["dotcom_id"].dropna().astype(int).tolist())
        skills_only = df_skills_users[~df_skills_users["dotcom_id"].isin(existing_ids)].copy()
        
        if len(skills_only) > 0:
            log(f"Adding {len(skills_only):,} Skills-only users to base population", "info")
            
            # Create ACE-compatible records for Skills-only users
            skills_only_records = pd.DataFrame({
                "email": "",  # Will be populated from demographics if available
                "dotcom_id": skills_only["dotcom_id"].astype(int),
                "userhandle": skills_only["userhandle"],
                "first_name": "",
                "last_name": "",
                "job_role": "",
                "exam_company": "",
                "exam_company_type": "",
                "ace_company": "",
                "ace_company_type": "",
                "exam_country": "",
                "exam_region": "",
                "ace_country": "",
                "ace_region": "",
                "registration_date": skills_only["first_skills_visit"],
                "total_exams": 0,
                "exams_passed": 0,
                "first_exam": pd.NaT,
                "last_exam": pd.NaT,
                "cert_names": [[]]*len(skills_only),
                "exam_codes": [[]]*len(skills_only),
                "events_registered": 0,
                "first_event": pd.NaT,
                "last_event": pd.NaT,
                "learner_status": "Skills Learner",
                "journey_stage": "Stage 3: Engaged",
                # Add Skills-specific fields
                "skills_page_views": skills_only["skills_page_views"],
                "skills_sessions": skills_only["skills_sessions"],
                "first_skills_visit": skills_only["first_skills_visit"],
                "last_skills_visit": skills_only["last_skills_visit"],
                "skills_completed": skills_only["skills_completed"],
                "skills_count": skills_only["skills_count"],
                "ai_skills_count": skills_only["ai_skills_count"],
                "actions_skills_count": skills_only["actions_skills_count"],
                "git_skills_count": skills_only["git_skills_count"],
                "security_skills_count": skills_only["security_skills_count"],
            })
            
            # Concat Skills-only users to main dataframe
            df = pd.concat([df, skills_only_records], ignore_index=True)
            log(f"After adding Skills-only users: {len(df):,} total learners", "info")
        else:
            log("All Skills users already in ACE base", "info")
        
        # Also merge Skills data onto ACE users who used Skills courses
        # This ensures ACE learners get skills_page_views, skills_count, etc.
        skills_merge_cols = [
            "dotcom_id", "skills_page_views", "skills_sessions", 
            "first_skills_visit", "last_skills_visit", "skills_completed", "skills_count",
            "ai_skills_count", "actions_skills_count", "git_skills_count", "security_skills_count"
        ]
        skills_data = df_skills_users[[c for c in skills_merge_cols if c in df_skills_users.columns]].copy()
        if not skills_data.empty:
            df = merge_on_dotcom_id(df, skills_data, "Skills Users")
    del df_skills_users  # Free memory

    # ==========================================================================
    # Add Partner-certified users to the base population
    # These are users who got certified through partners but aren't in ACE portal
    # ==========================================================================
    if not df_partner.empty:
        # Find partner-certified users who are NOT already in base (by email)
        existing_emails = set(df["email"].dropna().str.lower().tolist())
        partner_only = df_partner[~df_partner["email"].str.lower().isin(existing_emails)].copy()
        
        if len(partner_only) > 0:
            log(f"Adding {len(partner_only):,} partner-certified users to base population", "info")
            
            # Create ACE-compatible records for partner-certified users
            partner_only_records = pd.DataFrame({
                "email": partner_only["email"],
                "dotcom_id": 0,  # Will be populated from demographics if available
                "userhandle": "",
                "first_name": "",
                "last_name": "",
                "job_role": "",
                "exam_company": "",
                "exam_company_type": "",
                "ace_company": "",
                "ace_company_type": "",
                "exam_country": "",
                "exam_region": "",
                "ace_country": "",
                "ace_region": "",
                "registration_date": partner_only["first_partner_cert"],
                "total_exams": partner_only["partner_certs"],  # Count partner certs as exams
                "exams_passed": partner_only["partner_certs"],  # Partner certs are passed
                "first_exam": partner_only["first_partner_cert"],
                "last_exam": partner_only["last_partner_cert"],
                "cert_names": partner_only["partner_cert_names"],
                "exam_codes": [[]]*len(partner_only),
                "events_registered": 0,
                "first_event": pd.NaT,
                "last_event": pd.NaT,
                "learner_status": "Partner Certified",
                "journey_stage": "Stage 6: Certified",
                # Add partner-specific fields directly
                "partner_certs": partner_only["partner_certs"],
                "partner_cert_names": partner_only["partner_cert_names"],
                "partner_companies": partner_only["partner_companies"],
                "first_partner_cert": partner_only["first_partner_cert"],
                "last_partner_cert": partner_only["last_partner_cert"],
            })
            
            # Concat partner-only users to main dataframe
            df = pd.concat([df, partner_only_records], ignore_index=True)
            log(f"After adding partner-certified users: {len(df):,} total learners", "info")
        else:
            log("All partner-certified users already in base", "info")

    # ==========================================================================
    # OPTIMIZED MERGES - Use index-based joins for speed
    # Each merge frees the source DataFrame to reduce memory footprint
    # ==========================================================================
    
    # NOTE: Skills/Learn merge removed - Skills Users already provides skills_page_views
    # when we add Skills-only users to the base population above
    
    # Merge GitHub Learn activity (on dotcom_id)
    df = merge_on_dotcom_id(df, df_learn, "GitHub Learn")
    del df_learn  # Free memory

    # Merge Partner Credentials (on email - special handling)
    if not df_partner.empty:
        df = df.merge(df_partner, on="email", how="left", suffixes=("", "_new"))
        for col in ["partner_certs", "partner_cert_names", "partner_companies", "first_partner_cert", "last_partner_cert"]:
            if f"{col}_new" in df.columns:
                df[col] = df[col].combine_first(df[f"{col}_new"])
                df.drop(columns=[f"{col}_new"], inplace=True)
        log(f"After Partner merge: {len(df):,} rows", "info")
    del df_partner  # Free memory

    # Merge Demographics (on dotcom_id)
    df = merge_on_dotcom_id(df, df_demographics, "Demographics")
    del df_demographics  # Free memory

    # Merge Org Enrichment (on dotcom_id)
    df = merge_on_dotcom_id(df, df_org, "Org Enrichment")
    del df_org  # Free memory

    # Merge User Company (direct user-level company data from account_hierarchy_dotcom_all)
    df = merge_on_dotcom_id(df, df_user_company, "User Company")
    del df_user_company  # Free memory

    # Merge Product Usage (on dotcom_id)
    df = merge_on_dotcom_id(df, df_usage, "Product Usage")
    del df_usage  # Free memory
    
    # Merge Pre-Certification Usage (product usage in 90 days before certification)
    df = merge_on_dotcom_id(df, df_precert_usage, "Pre-Cert Usage")
    del df_precert_usage  # Free memory
    
    merge_elapsed = (datetime.now() - merge_start).total_seconds()
    log(f"All merges completed in {merge_elapsed:.1f}s", "success")

    # ==========================================================================
    # Apply derived fields and company/country resolution (VECTORIZED for speed)
    # Old: row-by-row apply() took ~30-60 seconds on 100k rows
    # New: vectorized operations take ~1-2 seconds (30x faster)
    # ==========================================================================
    log("Applying derived fields (vectorized)...", "start")
    derive_start = datetime.now()

    # Resolve company name with fallback hierarchy - VECTORIZED
    df["company_name"], df["company_source"] = resolve_company_vectorized(df)

    # Resolve country with fallback hierarchy - VECTORIZED
    df["country"] = resolve_country_vectorized(df)

    # Derive region from country - already vectorized via Series.apply (single column)
    df["region"] = df["country"].apply(derive_region)
    
    # ==========================================================================
    # Skill Maturity Score Calculation (Python post-processing)
    # Calculated here if not returned by Kusto query (for reliability)
    # Level 1 (25 pts): Basic GitHub (PR + Issues)
    # Level 2 (25 pts): CI/CD (Actions)
    # Level 3 (25 pts): Advanced Tools (Copilot + Security)
    # Level 4 (25 pts): Ecosystem (Packages + Projects + Discussions + Pages + Code Search)
    # ==========================================================================
    if "skill_maturity_score" not in df.columns or df["skill_maturity_score"].isna().all():
        log("Calculating skill maturity scores in Python...", "info")
        
        # Calculate skill maturity score
        skill_score = pd.Series(0, index=df.index, dtype=int)
        
        # Level 1: Basic GitHub collaboration (up to 25 pts)
        if "pr_days" in df.columns:
            skill_score += (df["pr_days"].fillna(0) > 0).astype(int) * 15
        if "issues_days" in df.columns:
            skill_score += (df["issues_days"].fillna(0) > 0).astype(int) * 10
        
        # Level 2: CI/CD automation (up to 25 pts)
        if "actions_days" in df.columns:
            skill_score += (df["actions_days"].fillna(0) > 0).astype(int) * 25
        
        # Level 3: Advanced developer tools (up to 25 pts)
        if "copilot_days" in df.columns:
            skill_score += (df["copilot_days"].fillna(0) > 0).astype(int) * 15
        if "security_days" in df.columns:
            skill_score += (df["security_days"].fillna(0) > 0).astype(int) * 10
        
        # Level 4: Full ecosystem adoption (up to 25 pts)
        if "packages_days" in df.columns:
            skill_score += (df["packages_days"].fillna(0) > 0).astype(int) * 6
        if "projects_days" in df.columns:
            skill_score += (df["projects_days"].fillna(0) > 0).astype(int) * 5
        if "discussions_days" in df.columns:
            skill_score += (df["discussions_days"].fillna(0) > 0).astype(int) * 5
        if "pages_days" in df.columns:
            skill_score += (df["pages_days"].fillna(0) > 0).astype(int) * 4
        if "code_search_days" in df.columns:
            skill_score += (df["code_search_days"].fillna(0) > 0).astype(int) * 5
        
        df["skill_maturity_score"] = skill_score
        
        # Calculate skill maturity level
        df["skill_maturity_level"] = pd.cut(
            skill_score,
            bins=[-1, 19, 39, 59, 79, 100],
            labels=["Novice", "Beginner", "Intermediate", "Advanced", "Expert"]
        ).astype(str)
        
        # Calculate products adopted count
        products_count = pd.Series(0, index=df.index, dtype=int)
        for col in ["copilot_days", "actions_days", "security_days", "pr_days", "issues_days",
                    "code_search_days", "packages_days", "projects_days", "discussions_days", "pages_days"]:
            if col in df.columns:
                products_count += (df[col].fillna(0) > 0).astype(int)
        df["products_adopted_count"] = products_count
        
        log(f"Skill maturity calculated: Avg score={skill_score.mean():.1f}", "info")
    
    derive_elapsed = (datetime.now() - derive_start).total_seconds()
    log(f"Derived fields applied in {derive_elapsed:.1f}s", "success")

    # ==========================================================================
    # Data Quality Scoring (VECTORIZED for speed)
    # Old: row-by-row apply() took ~20-40 seconds on 100k rows
    # New: vectorized operations take ~0.5 seconds (40-80x faster)
    # ==========================================================================
    log("Calculating data quality scores (vectorized)...", "start")
    quality_start = datetime.now()
    
    # Weights for quality score calculation
    QUALITY_WEIGHTS = {
        "email": 10, "userhandle": 10, "dotcom_id": 10, "country": 10,  # Core identity: 40 pts
        "company_name": 15, "company_source_verified": 10,  # Company attribution: 25 pts
        "exams_passed": 5, "skills_page_views": 5, "learn_page_views": 5, "partner_certs": 5,  # Learning: 20 pts
        "copilot_days": 5, "actions_days": 5, "total_active_days": 5,  # Product usage: 15 pts
    }
    
    # Calculate quality score vectorized
    score = pd.Series(0, index=df.index, dtype=int)
    
    # Core identity (40 points)
    if "email" in df.columns:
        score += ((df["email"].notna()) & (df["email"] != "")).astype(int) * QUALITY_WEIGHTS["email"]
    if "userhandle" in df.columns:
        score += ((df["userhandle"].notna()) & (df["userhandle"] != "")).astype(int) * QUALITY_WEIGHTS["userhandle"]
    if "dotcom_id" in df.columns:
        score += (df["dotcom_id"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["dotcom_id"]
    if "country" in df.columns:
        score += ((df["country"].notna()) & (df["country"] != "")).astype(int) * QUALITY_WEIGHTS["country"]
    
    # Company attribution (25 points)
    if "company_name" in df.columns:
        score += ((df["company_name"].notna()) & (df["company_name"] != "")).astype(int) * QUALITY_WEIGHTS["company_name"]
    if "company_source" in df.columns:
        verified_sources = ["billing_customer", "salesforce_account", "salesforce_parent"]
        score += df["company_source"].isin(verified_sources).astype(int) * QUALITY_WEIGHTS["company_source_verified"]
    
    # Learning activity (20 points)
    if "exams_passed" in df.columns:
        score += (df["exams_passed"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["exams_passed"]
    if "skills_page_views" in df.columns:
        score += (df["skills_page_views"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["skills_page_views"]
    if "learn_page_views" in df.columns:
        score += (df["learn_page_views"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["learn_page_views"]
    if "partner_certs" in df.columns:
        score += (df["partner_certs"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["partner_certs"]
    
    # Product usage (15 points)
    if "copilot_days" in df.columns:
        score += (df["copilot_days"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["copilot_days"]
    if "actions_days" in df.columns:
        score += (df["actions_days"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["actions_days"]
    if "total_active_days" in df.columns:
        score += (df["total_active_days"].fillna(0) > 0).astype(int) * QUALITY_WEIGHTS["total_active_days"]
    
    df["data_quality_score"] = score
    
    # Categorize quality level - vectorized with np.select
    conditions = [score >= 70, score >= 40]
    choices = ["high", "medium"]
    df["data_quality_level"] = np.select(conditions, choices, default="low")
    
    quality_elapsed = (datetime.now() - quality_start).total_seconds()
    
    quality_dist = df["data_quality_level"].value_counts()
    avg_score = df["data_quality_score"].mean()
    log(f"Data quality calculated in {quality_elapsed:.1f}s - Avg: {avg_score:.1f}, High: {quality_dist.get('high', 0):,}, Med: {quality_dist.get('medium', 0):,}, Low: {quality_dist.get('low', 0):,}", "info")

    # ==========================================================================
    # COMPREHENSIVE JOURNEY STAGE RECALCULATION
    # Recalculate journey_stage and learner_status using ALL merged signals:
    # - Certification data (exams_passed)
    # - Skills course enrollments (skills_count)
    # - Learning page views (learn_page_views, skills_page_views)
    # - Product adoption (copilot_days, actions_days, uses_copilot, uses_actions)
    # - Platform activity (total_active_days, total_contribution_events)
    # - Engagement (total_engagement_events)
    #
    # Stages (from first touch to mastery):
    # 1. Discovered: User exists in system (registered but no activity)
    # 2. Exploring: Engaged with learning content or GitHub products
    # 3. Active: Regular platform activity and contributions
    # 4. Learning: Actively enrolled in courses or consuming learning content
    # 5. Certified: Earned first GitHub certification
    # 6. Power User: Multiple certifications or deep product expertise
    # 7. Champion: 4+ certifications, expert driving adoption
    # ==========================================================================
    log("Recalculating journey stages with comprehensive signals...", "start")
    journey_start = datetime.now()
    
    # Get all relevant columns with safe defaults
    exams_passed = df["exams_passed"].fillna(0).astype(int) if "exams_passed" in df.columns else pd.Series(0, index=df.index)
    skills_count = df["skills_count"].fillna(0).astype(int) if "skills_count" in df.columns else pd.Series(0, index=df.index)
    learn_views = df["learn_page_views"].fillna(0).astype(int) if "learn_page_views" in df.columns else pd.Series(0, index=df.index)
    skills_views = df["skills_page_views"].fillna(0).astype(int) if "skills_page_views" in df.columns else pd.Series(0, index=df.index)
    copilot_days = df["copilot_days"].fillna(0).astype(int) if "copilot_days" in df.columns else pd.Series(0, index=df.index)
    actions_days = df["actions_days"].fillna(0).astype(int) if "actions_days" in df.columns else pd.Series(0, index=df.index)
    active_days = df["total_active_days"].fillna(0).astype(int) if "total_active_days" in df.columns else pd.Series(0, index=df.index)
    engagement = df["total_engagement_events"].fillna(0).astype(int) if "total_engagement_events" in df.columns else pd.Series(0, index=df.index)
    contributions = df["total_contribution_events"].fillna(0).astype(int) if "total_contribution_events" in df.columns else pd.Series(0, index=df.index)
    products_used = df["products_adopted_count"].fillna(0).astype(int) if "products_adopted_count" in df.columns else pd.Series(0, index=df.index)
    
    # Calculate journey stage using vectorized conditions (ordered from highest to lowest)
    # Start with lowest stage and override with higher stages
    journey_stage = pd.Series("Discovered", index=df.index)
    learner_status = pd.Series("Registered", index=df.index)
    
    # Stage 2: Exploring - Visited learning content OR any engagement OR product usage
    is_exploring = (learn_views > 0) | (skills_views > 0) | (engagement > 0) | (copilot_days > 0) | (actions_days > 0)
    journey_stage = journey_stage.where(~is_exploring, "Exploring")
    learner_status = learner_status.where(~is_exploring, "Engaged")
    
    # Stage 3: Active - GitHub platform activity (commits, PRs, etc.)
    is_active = (contributions > 0) | (active_days >= 7)
    journey_stage = journey_stage.where(~is_active, "Active")
    learner_status = learner_status.where(~is_active, "Active")
    
    # Stage 4: Learning - Skills enrollment OR high learn engagement
    is_learning = (skills_count > 0) | ((learn_views > 0) & (engagement >= 10))
    journey_stage = journey_stage.where(~is_learning, "Learning")
    learner_status = learner_status.where(~is_learning, "Learning")
    
    # Stage 5: Certified - 1 certification
    is_certified = (exams_passed >= 1)
    journey_stage = journey_stage.where(~is_certified, "Certified")
    learner_status = learner_status.where(~is_certified, "Certified")
    
    # Stage 6: Power User - 2-3 certs OR (1 cert + 2 products + 30 active days)
    is_power_user = (exams_passed >= 2) | ((exams_passed >= 1) & (products_used >= 2) & (active_days >= 30))
    journey_stage = journey_stage.where(~is_power_user, "Power User")
    learner_status = learner_status.where(~is_power_user, "Multi-Certified")
    
    # Stage 7: Champion - 4+ certifications
    is_champion = (exams_passed >= 4)
    journey_stage = journey_stage.where(~is_champion, "Champion")
    learner_status = learner_status.where(~is_champion, "Champion")
    
    # Update the dataframe with recalculated values
    df["journey_stage"] = journey_stage
    df["learner_status"] = learner_status
    
    journey_elapsed = (datetime.now() - journey_start).total_seconds()
    stage_counts = df["journey_stage"].value_counts()
    log(f"Journey stages recalculated in {journey_elapsed:.1f}s", "success")
    log("Journey stage distribution:", "info")
    for stage in ["Discovered", "Exploring", "Active", "Learning", "Certified", "Power User", "Champion"]:
        count = stage_counts.get(stage, 0)
        pct = 100 * count / len(df)
        log(f"  {stage}: {count:,} ({pct:.1f}%)", "info")

    # Fill NaN for boolean fields
    bool_cols = [
        "is_staff", "is_spammy", "is_suspended", "is_disabled",
        "is_paid", "is_dunning", "is_education",
        "org_is_paid", "org_is_education", "org_is_emu", "org_has_enterprise_agreements",
        "enterprise_is_paid", "enterprise_is_emu", "enterprise_has_enterprise_agreements",
        "uses_copilot", "uses_actions", "uses_security"
    ]
    for col in bool_cols:
        if col in df.columns:
            df[col] = df[col].fillna(False).astype(bool)

    # Fill NaN for numeric fields
    numeric_cols = [
        "total_exams", "exams_passed", "events_registered",
        "skills_page_views", "skills_sessions", "learn_page_views", "learn_sessions",
        "partner_certs", "total_arr_in_dollars", "total_paid_seats", "total_billable_seats",
        "org_count", "copilot_days", "copilot_engagement_events", "copilot_contribution_events",
        "actions_days", "actions_engagement_events", "actions_contribution_events",
        "security_days", "security_engagement_events",
        "total_active_days", "total_engagement_events", "total_contribution_events"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    # ==========================================================================
    # Normalize date/datetime columns to avoid parquet serialization issues
    # ==========================================================================
    datetime_cols = [
        "registration_date", "first_exam", "last_exam", "first_event", "last_event",
        "first_skills_visit", "last_skills_visit", "first_learn_visit", "last_learn_visit",
        "first_partner_cert", "last_partner_cert", "account_created_at",
        "first_paid_date", "first_activity", "last_activity"
    ]
    for col in datetime_cols:
        if col in df.columns:
            # Convert to datetime, coercing errors to NaT, then remove timezone info
            df[col] = pd.to_datetime(df[col], errors="coerce", utc=True)
            if df[col].dt.tz is not None:
                df[col] = df[col].dt.tz_localize(None)

    # ==========================================================================
    # Filter out excluded users
    # ==========================================================================
    original_count = len(df)
    # Safely check for is_staff and is_spammy columns
    is_staff = df["is_staff"] if "is_staff" in df.columns else pd.Series([False] * len(df))
    is_spammy = df["is_spammy"] if "is_spammy" in df.columns else pd.Series([False] * len(df))
    df = df[~(is_staff.fillna(False) | is_spammy.fillna(False))]
    excluded_count = original_count - len(df)
    if excluded_count > 0:
        log(f"Excluded {excluded_count:,} staff/spammy users", "info")

    # ==========================================================================
    # MEMORY OPTIMIZATION: Downcast numeric types to reduce file size
    # This can reduce parquet file size by 30-50%
    # ==========================================================================
    log("Optimizing memory usage...", "start")
    mem_before = df.memory_usage(deep=True).sum() / (1024 * 1024)
    
    # Downcast integer columns
    int_cols = df.select_dtypes(include=['int64', 'int32']).columns
    for col in int_cols:
        df[col] = pd.to_numeric(df[col], downcast='integer')
    
    # Downcast float columns
    float_cols = df.select_dtypes(include=['float64']).columns
    for col in float_cols:
        df[col] = pd.to_numeric(df[col], downcast='float')
    
    # Convert low-cardinality string columns to category (saves memory)
    categorical_cols = ['learner_status', 'journey_stage', 'company_source', 
                       'data_quality_level', 'region', 'plan', 'billing_type']
    for col in categorical_cols:
        if col in df.columns and df[col].dtype == 'object':
            df[col] = df[col].astype('category')
    
    mem_after = df.memory_usage(deep=True).sum() / (1024 * 1024)
    log(f"Memory: {mem_before:.1f} MB → {mem_after:.1f} MB ({100*(1-mem_after/mem_before):.0f}% reduction)", "success")

    # ==========================================================================
    # Save to Parquet
    # ==========================================================================
    log(f"Saving {len(df):,} enriched learners to Parquet...", "start")

    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Save as Parquet
    df.to_parquet(OUTPUT_FILE, index=False, compression="snappy")
    file_size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    log(f"Saved {OUTPUT_FILE.name} ({file_size_mb:.1f} MB)", "success")

    # Also save as CSV for debugging
    csv_file = DATA_DIR / "learners_enriched.csv"
    df.to_csv(csv_file, index=False)
    log(f"Also saved {csv_file.name} for debugging", "info")

    # Update sync status
    update_sync_status("enriched_learners", "success", len(df))

    # ==========================================================================
    # Print summary statistics
    # ==========================================================================
    log("=== SYNC SUMMARY ===", "success")
    log(f"Total learners: {len(df):,}", "info")
    log(f"With dotcom_id: {(df['dotcom_id'] > 0).sum():,}", "info")
    log(f"With company: {(df['company_name'] != '').sum():,} ({100*(df['company_name'] != '').mean():.1f}%)", "info")
    log(f"With country: {(df['country'] != '').sum():,} ({100*(df['country'] != '').mean():.1f}%)", "info")
    log(f"Certified: {(df['exams_passed'] > 0).sum():,}", "info")
    log(f"Using Copilot: {df['uses_copilot'].sum():,}", "info") if "uses_copilot" in df.columns else None
    log(f"Using Actions: {df['uses_actions'].sum():,}", "info") if "uses_actions" in df.columns else None

    # Company source breakdown
    log("Company source breakdown:", "info")
    for source, count in df["company_source"].value_counts().items():
        log(f"  {source}: {count:,} ({100*count/len(df):.1f}%)", "info")

    # Data quality breakdown
    if "data_quality_level" in df.columns:
        log("Data quality breakdown:", "info")
        for level, count in df["data_quality_level"].value_counts().items():
            log(f"  {level}: {count:,} ({100*count/len(df):.1f}%)", "info")
        avg_score = df["data_quality_score"].mean()
        log(f"Average data quality score: {avg_score:.1f}", "info")

    # Final sync status update with overall timing
    sync_end_time = datetime.now()
    status_data = {}
    if SYNC_STATUS_FILE.exists():
        with open(SYNC_STATUS_FILE) as f:
            status_data = json.load(f)
    
    status_data["last_sync"] = sync_end_time.isoformat()
    status_data["records_synced"] = len(df)
    status_data["sync_status"] = "success"
    
    with open(SYNC_STATUS_FILE, "w") as f:
        json.dump(status_data, f, indent=2)

    log("Enrichment sync complete!", "success")


if __name__ == "__main__":
    main()
