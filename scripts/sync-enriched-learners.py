#!/usr/bin/env python3
"""
Comprehensive Learner Enrichment Sync Script

Syncs ALL learner data with full enrichment from canonical tables:
- Query 1: ACE Learners (users, certifications, exams, events)
- Query 2: Skills/Learn Activity (hydro page views)
- Query 3: Partner Credentials (cse-analytics cluster)
- Query 4: User Demographics (accounts_all)
- Query 5: Org Enrichment (relationships → account_hierarchy_dotcom)
- Query 6: Enterprise Enrichment (relationships → account_hierarchy_enterprise)
- Query 7: Product Usage (user_daily_activity_per_product, 90-day window)

Output: data/learners_enriched.parquet

Usage:
  python scripts/sync-enriched-learners.py [--full] [--dry-run]

Options:
  --full      Force full refresh (ignore existing data)
  --dry-run   Show queries without executing
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

# Cluster URIs
CSE_CLUSTER = "https://cse-analytics.centralus.kusto.windows.net"
GH_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"

DATA_DIR = Path(__file__).parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "learners_enriched.parquet"
SYNC_STATUS_FILE = DATA_DIR / "sync_status.json"

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
# NOTE: The hydro analytics_v0_page_view table tracks github.com pages, not external sites
# Skills.github.com and learn.microsoft.com are external - skipping this query
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
    last_skills_visit = last_doc_visit,
    learn_page_views = toint(0),
    learn_sessions = toint(0),
    first_learn_visit = datetime(null),
    last_learn_visit = datetime(null)
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

# Query 4: User Demographics from accounts_all
QUERY_4_USER_DEMOGRAPHICS = """
// Get user demographics for learners
// Input: learner_ids from previous queries
let learner_ids = materialize(
    cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id
);

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

# Query 5: Org Enrichment from relationships + account_hierarchy_dotcom + enterprise
QUERY_5_ORG_ENRICHMENT = """
// Get org enrichment for learners via relationships
let learner_ids = materialize(
    cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id
);

// Get user-to-org relationships
let user_orgs = relationships_all
| where child_type == "User" and parent_type == "Organization"
| where child_dotcom_id in (learner_ids)
| summarize arg_max(day, *) by child_dotcom_id, parent_dotcom_id;

// Get org details from account_hierarchy_dotcom
let org_details = account_hierarchy_dotcom_all
| where account_type == "Organization"
| summarize arg_max(day, *) by dotcom_id;

// Get enterprise customer names (via org's enterprise_account_id)
let enterprise_names = account_hierarchy_enterprise_all
| summarize arg_max(day, *) by enterprise_account_id
| project enterprise_account_id, enterprise_customer_name = customer_name;

// Join user-org relationships with org details and enterprise names
user_orgs
| join kind=inner org_details on $left.parent_dotcom_id == $right.dotcom_id
| join kind=leftouter enterprise_names on enterprise_account_id
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
    org_msft_tpid = msft_tpid,
    org_msft_tpid_name = msft_tpid_name,
    org_customer_name = customer_name,
    enterprise_customer_name,
    org_has_enterprise_agreements = has_enterprise_agreements,
    org_count
"""

# Query 6 removed - enterprise_customer_name now obtained in Query 5 via org's enterprise_account_id

# Query 7: Product Usage from user_daily_activity_per_product (90-day window)
QUERY_7_PRODUCT_USAGE = """
// Get product usage for learners (last 90 days to avoid timeout)
let learner_ids = materialize(
    cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcomid) and dotcomid != ""
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id
);

user_daily_activity_per_product
| where day >= ago(90d)
| where user_id in (learner_ids)
| summarize
    // Copilot usage
    copilot_days = dcountif(day, product has "Copilot"),
    copilot_engagement_events = sumif(num_engagement_events, product has "Copilot"),
    copilot_contribution_events = sumif(num_contribution_events, product has "Copilot"),
    copilot_products = make_set_if(product, product has "Copilot", 10),
    copilot_features = make_set_if(feature, product has "Copilot", 20),
    // Actions usage
    actions_days = dcountif(day, product == "Actions"),
    actions_engagement_events = sumif(num_engagement_events, product == "Actions"),
    actions_contribution_events = sumif(num_contribution_events, product == "Actions"),
    // Security usage
    security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL", "SecretScanning")),
    security_engagement_events = sumif(num_engagement_events, product has_any ("Security", "Dependabot", "CodeQL", "SecretScanning")),
    // Overall activity
    total_active_days = dcount(day),
    total_engagement_events = sum(num_engagement_events),
    total_contribution_events = sum(num_contribution_events),
    products_used = make_set(product, 20),
    features_used = make_set(feature, 50),
    countries_active = make_set(country_code, 5),
    first_activity = min(day),
    last_activity = max(day)
by user_id
| extend
    uses_copilot = copilot_days > 0,
    uses_actions = actions_days > 0,
    uses_security = security_days > 0
| project
    dotcom_id = user_id,
    uses_copilot,
    copilot_days,
    copilot_engagement_events,
    copilot_contribution_events,
    copilot_products,
    copilot_features,
    uses_actions,
    actions_days,
    actions_engagement_events,
    actions_contribution_events,
    uses_security,
    security_days,
    security_engagement_events,
    total_active_days,
    total_engagement_events,
    total_contribution_events,
    products_used,
    features_used,
    countries_active,
    first_activity,
    last_activity
"""


def derive_region(country: str) -> str:
    """Derive region from country code."""
    if pd.isna(country) or not country:
        return "Unknown"
    return COUNTRY_TO_REGION.get(country.upper(), "Other")


def resolve_company(row: pd.Series) -> tuple:
    """
    Resolve company name using authoritative billing data only.
    Priority order (from verified billing/partner data):
    1. Enterprise customer_name (billing - most authoritative)
    2. Org customer_name (billing)
    3. Microsoft TPID name (partner program data)
    4. Org name (GitHub org login as fallback)
    
    Returns (company_name, source)
    """
    # Tier 1: Enterprise customer billing name (most authoritative)
    if pd.notna(row.get("enterprise_customer_name")) and row.get("enterprise_customer_name"):
        return row["enterprise_customer_name"], "enterprise_billing"
    
    # Tier 2: Org customer billing name
    if pd.notna(row.get("org_customer_name")) and row.get("org_customer_name"):
        return row["org_customer_name"], "org_billing"
    
    # Tier 3: Microsoft TPID (partner data)
    if pd.notna(row.get("org_msft_tpid_name")) and row.get("org_msft_tpid_name"):
        return row["org_msft_tpid_name"], "msft_tpid"
    
    # Tier 4: GitHub org name (fallback)
    if pd.notna(row.get("org_name")) and row.get("org_name"):
        return row["org_name"], "org_name"
    
    return "", "none"


def resolve_country(row: pd.Series) -> str:
    """
    Resolve country using comprehensive fallback hierarchy.
    Priority order:
    1. accounts_all country (verified account setting)
    2. Org country (from org enrichment)
    3. Exam country (self-reported at exam time)
    4. ACE registration country (self-reported at registration)
    5. Countries from product usage activity
    """
    # Tier 1: Verified account country
    if "country_account" in row and pd.notna(row["country_account"]) and str(row["country_account"]).strip():
        return str(row["country_account"]).strip()
    
    # Tier 2: Org country
    if "org_country" in row and pd.notna(row["org_country"]) and str(row["org_country"]).strip():
        return str(row["org_country"]).strip()
    
    # Tier 3: Exam registration country (FY22-25 and FY26 Pearson)
    if "exam_country" in row and pd.notna(row["exam_country"]) and str(row["exam_country"]).strip():
        return str(row["exam_country"]).strip()
    
    # Tier 4: ACE portal registration country
    if "ace_country" in row and pd.notna(row["ace_country"]) and str(row["ace_country"]).strip():
        return str(row["ace_country"]).strip()
    
    # Tier 5: Product usage activity countries
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
    parser.add_argument("--full", action="store_true", help="Force full refresh")
    parser.add_argument("--dry-run", action="store_true", help="Show queries without executing")
    args = parser.parse_args()

    log("Starting Comprehensive Learner Enrichment Sync", "start")
    log(f"Output: {OUTPUT_FILE}", "info")

    if args.dry_run:
        log("DRY RUN MODE - Showing queries only", "warning")
        print("\n=== Query 1: ACE Learners ===")
        print(QUERY_1_ACE_LEARNERS[:500] + "...")
        print("\n=== Query 4: User Demographics ===")
        print(QUERY_4_USER_DEMOGRAPHICS[:500] + "...")
        return

    # Initialize clients
    log("Connecting to Kusto clusters...", "info")
    gh_client = get_kusto_client(GH_CLUSTER)
    cse_client = get_kusto_client(CSE_CLUSTER)

    if not gh_client:
        log("Failed to connect to GH Analytics cluster", "error")
        sys.exit(1)

    # ==========================================================================
    # Execute queries
    # ==========================================================================

    # Query 1: ACE Learners (base data) - runs on CSE cluster since pearson_exam_results is there
    log("Query 1: ACE Learners...", "start")
    if not cse_client:
        log("CSE client not available - cannot query FY26 data", "error")
        sys.exit(1)
    df_ace = execute_query(cse_client, "ACE", QUERY_1_ACE_LEARNERS, "ACE Learners")
    if df_ace is None or df_ace.empty:
        log("Failed to get ACE learners - cannot continue", "error")
        sys.exit(1)
    update_sync_status("ace_learners", "success", len(df_ace))

    # Get learner dotcom_ids for filtering other queries
    learner_ids = df_ace[df_ace["dotcom_id"] > 0]["dotcom_id"].unique().tolist()
    log(f"Found {len(learner_ids):,} learners with dotcom_id", "info")

    # Query 2: Skills/Learn Activity
    log("Query 2: Skills/Learn Activity...", "start")
    df_skills = execute_query(gh_client, "hydro", QUERY_2_SKILLS_LEARN, "Skills/Learn")
    if df_skills is not None:
        update_sync_status("skills_learn", "success", len(df_skills))
    else:
        df_skills = pd.DataFrame()
        update_sync_status("skills_learn", "failed", 0, "Query failed")

    # Query 3: Partner Credentials (CSE cluster)
    log("Query 3: Partner Credentials...", "start")
    if cse_client:
        df_partner = execute_query(cse_client, "ACE", QUERY_3_PARTNER_CREDS, "Partner Creds")
        if df_partner is not None:
            update_sync_status("partner_creds", "success", len(df_partner))
        else:
            df_partner = pd.DataFrame()
            update_sync_status("partner_creds", "failed", 0, "Query failed")
    else:
        log("CSE client not available, skipping partner credentials", "warning")
        df_partner = pd.DataFrame()

    # Query 4: User Demographics
    log("Query 4: User Demographics...", "start")
    df_demographics = execute_query(gh_client, "canonical", QUERY_4_USER_DEMOGRAPHICS, "Demographics")
    if df_demographics is not None:
        update_sync_status("demographics", "success", len(df_demographics))
    else:
        df_demographics = pd.DataFrame()
        update_sync_status("demographics", "failed", 0, "Query failed")

    # Query 5: Org Enrichment
    log("Query 5: Org Enrichment...", "start")
    df_org = execute_query(gh_client, "canonical", QUERY_5_ORG_ENRICHMENT, "Org Enrichment")
    if df_org is not None:
        update_sync_status("org_enrichment", "success", len(df_org))
    else:
        df_org = pd.DataFrame()
        update_sync_status("org_enrichment", "failed", 0, "Query failed")

    # Query 6: Removed - enterprise_customer_name now in Query 5

    # Query 7: Product Usage
    log("Query 7: Product Usage (90-day window)...", "start")
    df_usage = execute_query(gh_client, "canonical", QUERY_7_PRODUCT_USAGE, "Product Usage")
    if df_usage is not None:
        update_sync_status("product_usage", "success", len(df_usage))
    else:
        df_usage = pd.DataFrame()
        update_sync_status("product_usage", "failed", 0, "Query failed")

    # ==========================================================================
    # Merge all data
    # ==========================================================================
    log("Merging all data sources...", "start")

    # Start with ACE learners as base
    df = df_ace.copy()
    log(f"Base: {len(df):,} ACE learners", "info")

    # Merge Skills/Learn (on dotcom_id)
    if not df_skills.empty:
        df = df.merge(df_skills, on="dotcom_id", how="left")
        log(f"After Skills/Learn merge: {len(df):,} rows", "info")

    # Merge Partner Credentials (on email since partner_credentials doesn't have dotcom_id)
    if not df_partner.empty:
        df = df.merge(df_partner, on="email", how="left")
        log(f"After Partner merge: {len(df):,} rows", "info")

    # Merge Demographics (on dotcom_id)
    if not df_demographics.empty:
        df = df.merge(df_demographics, on="dotcom_id", how="left")
        log(f"After Demographics merge: {len(df):,} rows", "info")

    # Merge Org Enrichment (on dotcom_id) - now includes enterprise_customer_name
    if not df_org.empty:
        df = df.merge(df_org, on="dotcom_id", how="left")
        log(f"After Org merge: {len(df):,} rows", "info")

    # Merge Product Usage (on dotcom_id)
    if not df_usage.empty:
        df = df.merge(df_usage, on="dotcom_id", how="left")
        log(f"After Product Usage merge: {len(df):,} rows", "info")

    # ==========================================================================
    # Apply derived fields and company/country resolution
    # ==========================================================================
    log("Applying derived fields...", "start")

    # Resolve company name with fallback hierarchy
    company_data = df.apply(resolve_company, axis=1, result_type="expand")
    df["company_name"] = company_data[0]
    df["company_source"] = company_data[1]

    # Resolve country with fallback hierarchy
    df["country"] = df.apply(resolve_country, axis=1)

    # Derive region from country
    df["region"] = df["country"].apply(derive_region)

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
    # Filter out excluded users
    # ==========================================================================
    original_count = len(df)
    df = df[~(df.get("is_staff", False) | df.get("is_spammy", False))]
    excluded_count = original_count - len(df)
    if excluded_count > 0:
        log(f"Excluded {excluded_count:,} staff/spammy users", "info")

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

    log("Enrichment sync complete!", "success")


if __name__ == "__main__":
    main()
