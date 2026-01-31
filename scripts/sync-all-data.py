#!/usr/bin/env python3
"""
Unified Data Sync Script - COMPLETE VERSION

Syncs ALL data sources for the Learning ROI Dashboard using BOTH Kusto clusters:
- CSE Analytics (cse-analytics.centralus.kusto.windows.net): FY26 Pearson exam data
- GH Analytics (gh-analytics.eastus.kusto.windows.net): FY22-25 exam data, product usage, learning activity

This script provides COMPLETE data coverage by:
1. Unioning FY22-25 (GH cluster) and FY26 (CSE cluster) exam data
2. Using 3-source email→dotcom_id mapping for identity resolution
3. Pulling product usage from canonical.user_daily_activity_per_product
4. Pulling learning activity from hydro.analytics_v0_page_view

Usage:
  python scripts/sync-all-data.py [--full] [--kusto-only] [--github-only]

Options:
  --full         Force full refresh (ignore cache)
  --kusto-only   Only sync Kusto data
  --github-only  Only sync GitHub API data
"""

import argparse
import csv
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add parent/backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

DATA_DIR = Path(__file__).parent.parent / "data"
SYNC_STATUS_FILE = DATA_DIR / "sync_status.json"

# Cluster URIs
CSE_CLUSTER = "https://cse-analytics.centralus.kusto.windows.net"
GH_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"


def log(msg: str, level: str = "info"):
    """Print a log message with timestamp."""
    icons = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "error": "❌", "start": "🚀", "debug": "🔍"}
    icon = icons.get(level, "•")
    print(f"{icon} [{datetime.now().strftime('%H:%M:%S')}] {msg}")


def save_csv(filename: str, rows: List[Dict], fieldnames: Optional[List[str]] = None):
    """Save rows to CSV file."""
    if not rows:
        log(f"No data to save for {filename}", "warning")
        return 0
    
    filepath = DATA_DIR / filename
    if fieldnames is None:
        fieldnames = list(rows[0].keys())
    
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    log(f"Saved {len(rows):,} rows to {filename}", "success")
    return len(rows)


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
        "error": error
    }
    
    with open(SYNC_STATUS_FILE, "w") as f:
        json.dump(status_data, f, indent=2)


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


def execute_query(client, database: str, query: str, description: str = "query") -> Optional[List[Dict]]:
    """Execute a Kusto query and return results as list of dicts."""
    if not client:
        log(f"No Kusto client available for {description}", "error")
        return None
    
    try:
        log(f"Executing {description}...", "debug")
        response = client.execute_query(database, query)
        
        results = []
        if response.primary_results:
            columns = [col.column_name for col in response.primary_results[0].columns]
            for row in response.primary_results[0].rows:
                results.append(dict(zip(columns, row)))
        
        log(f"{description}: retrieved {len(results):,} rows", "info")
        return results
    except Exception as e:
        log(f"{description} failed: {e}", "error")
        return None


# =============================================================================
# COMPREHENSIVE KUSTO QUERIES (ported from Streamlit app)
# =============================================================================

# Query to get certified users with dotcom_id for joining (from Streamlit)
CERTIFIED_USERS_WITH_IDS_QUERY = """
// Get email-to-dotcom mapping from multiple sources for maximum coverage
// AUTHORITATIVE SOURCE: snapshots.github_mysql1_user_emails_current - verified GitHub emails
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

// Get certified users from both FY22-25 and FY26 LEARNERS (all exam attempts)
let FY22_25 = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true
    | extend email = tolower(email), exam_name = examname, exam_code = examcode, cert_date = endtime, passed_flag = 1
    | project email, exam_name, exam_code, cert_date, passed_flag;

// FY26: Include ALL learners (passed + attempting)
let FY26 = pearson_exam_results
    | extend email = tolower(['Candidate Email']), exam_name = ['Exam Title'],
             exam_code = ['Exam Series Code'], cert_date = Date,
             passed_flag = iff(['Total Passed'] > 0, 1, 0)
    | project email, exam_name, exam_code, cert_date, passed_flag;

// Combine and aggregate by email - track both attempts and passes
let all_learners = union FY22_25, FY26
    | summarize
        first_exam_date = min(cert_date),
        latest_exam_date = max(cert_date),
        total_attempts = count(),
        total_passed = sum(passed_flag),
        cert_titles = make_set(exam_name, 5),
        exam_codes = make_set(exam_code, 5)
    by email;

// Join with email-to-id mapping
all_learners
| join kind=leftouter email_to_id on email
| extend
    cert_product_focus = case(
        exam_codes has "GH-200", "GitHub Actions",
        exam_codes has "GH-300", "GitHub Copilot",
        exam_codes has "GH-400", "Advanced Security",
        exam_codes has "GH-100", "Administration",
        "Foundations"
    ),
    learner_status = case(
        total_passed >= 4, "Champion",
        total_passed >= 3, "Specialist",
        total_passed >= 2, "Multi-Certified",
        total_passed == 1, "Certified",
        total_attempts > 0, "Learning",
        "Unknown"
    ),
    journey_stage = case(
        total_passed >= 4, "Stage 11: Champion",
        total_passed >= 3, "Stage 10: Specialist",
        total_passed >= 2, "Stage 9: Power User",
        total_passed == 1, "Stage 6: Certified",
        total_attempts > 0, "Stage 4: Learning",
        "Stage 1: Unaware"
    ),
    days_since_first_exam = datetime_diff('day', now(), first_exam_date)
| project
    email,
    dotcom_id = coalesce(dotcom_id, tolong(0)),
    user_handle = coalesce(user_handle, ""),
    learner_status,
    journey_stage,
    cert_product_focus,
    first_cert_date = first_exam_date,
    latest_cert_date = latest_exam_date,
    total_certs = total_passed,
    total_attempts,
    cert_titles,
    exam_codes,
    days_since_cert = days_since_first_exam
"""

# Individual exam records query (unions FY22-25 and FY26)
INDIVIDUAL_EXAMS_QUERY = """
// FY22-25 exam results with calculated scores from gh-analytics
let FY22_25_Records = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | extend
        email = tolower(email),
        exam_code = examcode,
        exam_name = examname,
        exam_date = endtime,
        exam_status = case(passed == true, "Passed", "Failed"),
        total_questions = toint(correct) + toint(incorrect),
        score_percent = iff(toint(correct) + toint(incorrect) > 0,
                           round(100.0 * toint(correct) / (toint(correct) + toint(incorrect)), 1),
                           0.0),
        source = "FY22-25"
    | where isnotempty(email)
    | project email, exam_code, exam_name, exam_date, exam_status, score_percent, source;

// FY26 Pearson data
let FY26_Records = cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
    | extend
        email = tolower(['Candidate Email']),
        exam_code = ['Exam Series Code'],
        exam_name = ['Exam Title'],
        exam_date = Date,
        exam_status = case(
            ['Total Passed'] > 0, "Passed",
            ['Total Failed'] > 0, "Failed",
            ['Registration Status'] == "No Show", "No Show",
            ['Registration Status'] == "Absent", "Absent",
            ['Registration Status'] == "Canceled", "Cancelled",
            ['Registration Status'] == "Scheduled", "Scheduled",
            "Registered"
        ),
        score_percent = todouble(['Score']),
        source = "FY26"
    | where isnotempty(email)
    | project email, exam_code, exam_name, exam_date, exam_status, score_percent, source;

// Combine all records
union FY22_25_Records, FY26_Records
| order by email asc, exam_date asc
"""

# Product usage query (from gh-analytics canonical database)
PRODUCT_USAGE_QUERY = """
// Get certified user dotcom_ids
let certified_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
| where passed == true
| where isnotempty(dotcomid) and dotcomid != ""
| extend dotcom_id = tolong(dotcomid)
| where dotcom_id > 0
| summarize by dotcom_id;

// Query product usage for certified users
cluster('gh-analytics.eastus.kusto.windows.net').database('canonical').user_daily_activity_per_product
| where day >= datetime(2024-01-01)
| where user_id in ((certified_ids | project dotcom_id))
| summarize
    activity_days = dcount(day),
    copilot_events = sumif(num_engagement_events, product has "Copilot"),
    copilot_days = dcountif(day, product has "Copilot"),
    actions_events = sumif(num_engagement_events, product == "Actions"),
    security_events = sumif(num_engagement_events, product has "Security"),
    total_events = sum(num_engagement_events)
by user_id
| extend product_usage_hours = todouble(activity_days) * 0.5 + todouble(copilot_days) * 0.25
| project
    dotcom_id = user_id,
    activity_days,
    copilot_events,
    copilot_days,
    actions_events,
    security_events,
    total_events,
    product_usage_hours
"""

# Learning activity query (from gh-analytics hydro database)
LEARNING_ACTIVITY_QUERY = """
cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
| where timestamp >= datetime(2024-01-01)
| where page contains "learn.microsoft.com"
     or page contains "skills.github.com"
     or page contains "docs.github.com"
| where isnotempty(user_login) or isnotempty(user_id)
| extend user_ref = coalesce(tolower(user_login), tostring(user_id))
| summarize
    page_views = count(),
    learning_sessions = dcount(bin(timestamp, 1h)),
    learning_days = dcount(bin(timestamp, 1d)),
    first_learning = min(timestamp),
    last_learning = max(timestamp)
by user_ref
| extend learning_hours = todouble(learning_sessions) + (todouble(page_views) * 0.05)
| project user_ref, page_views, learning_sessions, learning_days, learning_hours, first_learning, last_learning
"""

# =============================================================================
# COMPREHENSIVE LEARNING DATA QUERIES
# =============================================================================

# GitHub Learn (learn.github.com) engagement - authenticated users
GITHUB_LEARN_QUERY = """
// GitHub Learn Engagement (Authenticated Users Only)
// Aggregates page views from learn.github.com by user
cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
| where app == 'learn'
| where isnotempty(actor_id)
| where timestamp >= datetime(2024-01-01)
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

# GitHub Skills (skills/* repos) engagement - authenticated users
GITHUB_SKILLS_QUERY = """
// GitHub Skills Engagement (Authenticated Users Only)
// Aggregates page views from skills/* repos
cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').analytics_v0_page_view
| where repository_nwo startswith "skills/"
| where isnotempty(actor_id)
| where timestamp >= datetime(2024-01-01)
| extend skill_name = tostring(split(repository_nwo, "/")[1])
| extend skill_category = case(
    skill_name has "copilot" or skill_name has "mcp" or skill_name has "spark", "AI/Copilot",
    skill_name has "action" or skill_name has "workflow", "Actions",
    skill_name has "git" or skill_name has "pull-request" or skill_name has "merge", "Git/GitHub Basics",
    skill_name has "code" or skill_name has "codespace", "Development",
    skill_name has "secure" or skill_name has "security", "Security",
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
    ai_skills_views = countif(skill_category == "AI/Copilot"),
    actions_skills_views = countif(skill_category == "Actions"),
    git_skills_views = countif(skill_category == "Git/GitHub Basics"),
    security_skills_views = countif(skill_category == "Security")
  by dotcom_id = actor_id
| where skills_page_views > 0
"""

# GitHub Docs (docs.github.com) engagement - authenticated users
GITHUB_DOCS_QUERY = """
// GitHub Docs Engagement (Authenticated Users Only)
// Aggregates page views from docs.github.com by user
cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').docs_v0_page_event
| where timestamp >= datetime(2024-01-01)
| extend dotcom_user = tostring(context.dotcom_user)
| where isnotempty(dotcom_user) and dotcom_user != ""
| extend product_area = tostring(context.path_product)
| extend product_category = case(
    product_area has "copilot", "AI/Copilot",
    product_area has "actions", "Actions",
    product_area has "codespaces", "Codespaces",
    product_area has "code-security" or product_area has "security", "Security",
    product_area has "packages" or product_area has "container", "Packages",
    product_area has "admin" or product_area has "enterprise", "Enterprise",
    product_area has "get-started" or product_area has "authentication", "Getting Started",
    "Other"
)
| summarize
    docs_page_views = count(),
    docs_sessions = dcount(tostring(context.octo_client_id)),
    first_docs_visit = min(timestamp),
    last_docs_visit = max(timestamp),
    docs_products_viewed = make_set(product_area, 20),
    docs_products_count = dcount(product_area),
    copilot_docs_views = countif(product_category == "AI/Copilot"),
    actions_docs_views = countif(product_category == "Actions"),
    security_docs_views = countif(product_category == "Security"),
    getting_started_docs_views = countif(product_category == "Getting Started")
  by dotcom_user
| where docs_page_views > 0
"""

# Event registrations and attendance
EVENTS_QUERY = """
// Event Registrations and Attendance
// From ace.event_registrants table
cluster('gh-analytics.eastus.kusto.windows.net').database('ace').event_registrants
| where updateddate >= datetime(2024-01-01)
| summarize
    events_registered = dcount(eventid),
    events_attended = dcountif(eventid, attendancetype == "Full" or attendancetype == "Partial"),
    events_no_show = dcountif(eventid, attendancetype == "No Show" or isempty(attendancetype)),
    first_event_date = min(updateddate),
    last_event_date = max(updateddate),
    event_categories = make_set(eventcategory, 10)
  by user_handle = userhandle
| where isnotempty(user_handle)
"""

# Education web program data
EDUCATION_WEB_QUERY = """
// Education Web Program Data
// From hydro.education_web tables
cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').education_web_v0_user_verification_status
| where timestamp >= datetime(2024-01-01)
| summarize
    verification_attempts = count(),
    verified = countif(status == "verified"),
    first_verification = min(timestamp),
    last_verification = max(timestamp)
  by user_id = tostring(actor_id)
| where isnotempty(user_id)
"""


# =============================================================================
# KUSTO DATA SYNC - OPTIMIZED WITH PARALLEL EXECUTION
# =============================================================================

def execute_queries_parallel(
    queries: List[tuple],
    max_workers: int = 4
) -> Dict[str, Optional[List[Dict]]]:
    """
    Execute multiple Kusto queries in parallel for faster sync.
    
    Args:
        queries: List of tuples (client, database, query, description)
        max_workers: Maximum parallel threads (default 4 to avoid throttling)
    
    Returns:
        Dict mapping description to result list (or None if failed)
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
                desc, result = future.result()
                results[desc] = result
                if result is not None:
                    log(f"  \u2713 {desc}: {len(result):,} rows", "success")
                else:
                    log(f"  \u2717 {desc}: failed", "error")
            except Exception as e:
                desc = futures[future]
                results[desc] = None
                log(f"  \u2717 {desc}: {e}", "error")
    
    elapsed = (datetime.now() - start_time).total_seconds()
    log(f"Parallel execution completed in {elapsed:.1f}s", "success")
    return results


def sync_kusto_data():
    """
    Sync data from Kusto clusters using comprehensive queries.
    OPTIMIZED: Uses parallel execution for 3-5x faster sync.
    """
    log("Starting Kusto data sync (parallel execution)...", "start")
    sync_start = datetime.now()
    
    try:
        # Create clients for both clusters
        cse_client = get_kusto_client(CSE_CLUSTER)
        gh_client = get_kusto_client(GH_CLUSTER)
        
        if not cse_client and not gh_client:
            log("No Kusto clients available - skipping", "warning")
            update_sync_status("kusto", "unavailable")
            return
        
        log(f"Connected to clusters: CSE={cse_client is not None}, GH={gh_client is not None}", "info")
        
        # Build list of queries to execute in parallel
        parallel_queries = []
        
        # CSE cluster queries
        if cse_client:
            parallel_queries.extend([
                (cse_client, "ACE", CERTIFIED_USERS_WITH_IDS_QUERY, "certified_users"),
            ])
        
        # GH cluster queries
        if gh_client:
            parallel_queries.extend([
                (gh_client, "ace", INDIVIDUAL_EXAMS_QUERY, "individual_exams"),
                (gh_client, "canonical", PRODUCT_USAGE_QUERY, "product_usage"),
                (gh_client, "hydro", LEARNING_ACTIVITY_QUERY, "learning_activity"),
                (gh_client, "hydro", GITHUB_LEARN_QUERY, "github_learn"),
                (gh_client, "hydro", GITHUB_SKILLS_QUERY, "github_skills"),
                (gh_client, "hydro", GITHUB_DOCS_QUERY, "github_docs"),
                (gh_client, "ace", EVENTS_QUERY, "events"),
            ])
        
        # Execute all queries in parallel
        results = execute_queries_parallel(parallel_queries, max_workers=4)
        
        # Process and save results
        for desc, rows in results.items():
            if rows is None:
                update_sync_status(desc, "error", error="Query failed")
                continue
            
            # Process and save each result type
            if desc == "certified_users":
                save_certified_users(rows)
                # Also save as unified_users (same data, different file)
                save_unified_users(rows)
            elif desc == "individual_exams":
                save_individual_exams(rows)
            elif desc == "product_usage":
                save_product_usage(rows)
            elif desc == "learning_activity":
                save_learning_activity(rows)
            elif desc == "github_learn":
                save_github_learn(rows)
            elif desc == "github_skills":
                save_github_skills(rows)
            elif desc == "github_docs":
                save_github_docs(rows)
            elif desc == "events":
                save_events(rows)
        
        elapsed = (datetime.now() - sync_start).total_seconds()
        log(f"Kusto sync complete in {elapsed:.1f}s!", "success")
        
    except Exception as e:
        log(f"Kusto sync failed: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("kusto", "error", error=str(e))


# =============================================================================
# SAVE FUNCTIONS - Separated from query execution for parallel processing
# =============================================================================

def save_certified_users(rows: List[Dict]):
    """Process and save certified users data."""
    if not rows:
        return
    for row in rows:
        for date_field in ["first_cert_date", "latest_cert_date"]:
            if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                row[date_field] = row[date_field].isoformat()
        for list_field in ["cert_titles", "exam_codes"]:
            if row.get(list_field) and isinstance(row[list_field], list):
                row[list_field] = ",".join(str(x) for x in row[list_field])
    
    count = save_csv("certified_users.csv", rows)
    with_dotcom = sum(1 for r in rows if r.get("dotcom_id", 0) > 0)
    total_passed = sum(r.get("total_certs", 0) for r in rows)
    log(f"   Users with dotcom_id: {with_dotcom:,}/{len(rows):,}", "info")
    log(f"   Total certifications: {total_passed:,}", "info")
    update_sync_status("certified_users", "success", count)


def save_unified_users(rows: List[Dict]):
    """Save unified users (same as certified users, different file)."""
    if not rows:
        return
    count = save_csv("unified_users.csv", rows)
    status_counts = {}
    for r in rows:
        status = r.get("learner_status", "Unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    log(f"   Status breakdown: {status_counts}", "info")
    update_sync_status("unified_users", "success", count)


def save_individual_exams(rows: List[Dict]):
    """Process and save individual exam records."""
    if not rows:
        return
    CERT_NAME_MAP = {
        "ACTIONS": "GitHub Actions", "ADMIN": "GitHub Administration",
        "GHAS": "GitHub Advanced Security", "GHF": "GitHub Foundations",
        "COPILOT": "GitHub Copilot", "GH-100": "GitHub Administration",
        "GH-200": "GitHub Actions", "GH-300": "GitHub Copilot",
        "GH-400": "GitHub Advanced Security",
    }
    for row in rows:
        code = row.get("exam_code", "")
        if code and code.upper() in CERT_NAME_MAP:
            row["exam_name"] = CERT_NAME_MAP[code.upper()]
        if row.get("exam_date") and hasattr(row["exam_date"], "isoformat"):
            row["exam_date"] = row["exam_date"].isoformat()
        score = row.get("score_percent")
        if score is not None and score > 0:
            row["score_percent"] = round(float(score), 1)
        else:
            row["score_percent"] = ""
    
    count = save_csv("individual_exams.csv", rows)
    status_counts = {}
    for r in rows:
        status = r.get("exam_status", "Unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    log(f"   Status breakdown: {status_counts}", "info")
    unique_emails = len(set(r.get("email", "") for r in rows))
    log(f"   Unique learners: {unique_emails:,}", "info")
    update_sync_status("individual_exams", "success", count)


def save_product_usage(rows: List[Dict]):
    """Process and save product usage data."""
    if not rows:
        return
    for row in rows:
        for field in ["copilot_events", "copilot_days", "actions_events", "security_events", "total_events", "activity_days"]:
            if row.get(field):
                row[field] = int(row[field])
        if row.get("product_usage_hours"):
            row["product_usage_hours"] = round(float(row["product_usage_hours"]), 2)
    
    count = save_csv("product_usage.csv", rows)
    with_copilot = sum(1 for r in rows if r.get("copilot_events", 0) > 0)
    avg_copilot = sum(r.get("copilot_events", 0) for r in rows) / max(len(rows), 1)
    log(f"   Users with Copilot activity: {with_copilot:,}", "info")
    log(f"   Avg Copilot events: {avg_copilot:.1f}", "info")
    update_sync_status("product_usage", "success", count)


def save_learning_activity(rows: List[Dict]):
    """Process and save learning activity data."""
    if not rows:
        return
    for row in rows:
        for date_field in ["first_learning", "last_learning"]:
            if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                row[date_field] = row[date_field].isoformat()
        if row.get("learning_hours"):
            row["learning_hours"] = round(float(row["learning_hours"]), 2)
    
    count = save_csv("learning_activity.csv", rows)
    avg_hours = sum(r.get("learning_hours", 0) for r in rows) / max(len(rows), 1)
    log(f"   Avg learning hours: {avg_hours:.1f}", "info")
    update_sync_status("learning_activity", "success", count)


def save_github_learn(rows: List[Dict]):
    """Process and save GitHub Learn engagement data."""
    if not rows:
        return
    for row in rows:
        for date_field in ["first_learn_visit", "last_learn_visit"]:
            if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                row[date_field] = row[date_field].isoformat()
        if row.get("content_types_viewed") and isinstance(row["content_types_viewed"], list):
            row["content_types_viewed"] = ",".join(str(x) for x in row["content_types_viewed"])
    
    count = save_csv("github_learn.csv", rows)
    total_views = sum(r.get("learn_page_views", 0) for r in rows)
    cert_viewers = sum(1 for r in rows if r.get("viewed_certifications", 0) > 0)
    log(f"   Total page views: {total_views:,}", "info")
    log(f"   Users who viewed certifications: {cert_viewers:,}", "info")
    update_sync_status("github_learn", "success", count)


def save_github_skills(rows: List[Dict]):
    """Process and save GitHub Skills engagement data."""
    if not rows:
        return
    for row in rows:
        for date_field in ["first_skills_visit", "last_skills_visit"]:
            if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                row[date_field] = row[date_field].isoformat()
        if row.get("skills_completed") and isinstance(row["skills_completed"], list):
            row["skills_completed"] = ",".join(str(x) for x in row["skills_completed"])
    
    count = save_csv("github_skills.csv", rows)
    total_views = sum(r.get("skills_page_views", 0) for r in rows)
    avg_skills = sum(r.get("skills_count", 0) for r in rows) / max(len(rows), 1)
    ai_learners = sum(1 for r in rows if r.get("ai_skills_views", 0) > 0)
    log(f"   Total page views: {total_views:,}", "info")
    log(f"   Avg skills per user: {avg_skills:.1f}", "info")
    log(f"   Users with AI/Copilot skills: {ai_learners:,}", "info")
    update_sync_status("github_skills", "success", count)


def save_github_docs(rows: List[Dict]):
    """Process and save GitHub Docs engagement data."""
    if not rows:
        return
    for row in rows:
        for date_field in ["first_docs_visit", "last_docs_visit"]:
            if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                row[date_field] = row[date_field].isoformat()
        if row.get("docs_products_viewed") and isinstance(row["docs_products_viewed"], list):
            row["docs_products_viewed"] = ",".join(str(x) for x in row["docs_products_viewed"])
    
    count = save_csv("github_docs.csv", rows)
    total_views = sum(r.get("docs_page_views", 0) for r in rows)
    copilot_viewers = sum(1 for r in rows if r.get("copilot_docs_views", 0) > 0)
    actions_viewers = sum(1 for r in rows if r.get("actions_docs_views", 0) > 0)
    log(f"   Total page views: {total_views:,}", "info")
    log(f"   Users viewing Copilot docs: {copilot_viewers:,}", "info")
    log(f"   Users viewing Actions docs: {actions_viewers:,}", "info")
    update_sync_status("github_docs", "success", count)


def save_events(rows: List[Dict]):
    """Process and save event registration data."""
    if not rows:
        return
    for row in rows:
        for date_field in ["first_event_date", "last_event_date"]:
            if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                row[date_field] = row[date_field].isoformat()
        if row.get("event_categories") and isinstance(row["event_categories"], list):
            row["event_categories"] = ",".join(str(x) for x in row["event_categories"])
    
    count = save_csv("events.csv", rows)
    total_registered = sum(r.get("events_registered", 0) for r in rows)
    total_attended = sum(r.get("events_attended", 0) for r in rows)
    attendance_rate = total_attended / max(total_registered, 1) * 100
    log(f"   Total registrations: {total_registered:,}", "info")
    log(f"   Total attended: {total_attended:,}", "info")
    log(f"   Attendance rate: {attendance_rate:.1f}%", "info")
    update_sync_status("events", "success", count)


# =============================================================================
# LEGACY SYNC FUNCTIONS - Kept for backwards compatibility
# =============================================================================


def sync_certified_users(client):
    """Sync certified users with dotcom_ids from both FY22-25 and FY26."""
    log("Syncing certified users (FY22-25 + FY26)...")
    
    try:
        rows = execute_query(client, "ACE", CERTIFIED_USERS_WITH_IDS_QUERY, "certified_users")
        if rows:
            # Format data for CSV
            for row in rows:
                # Handle date formatting
                for date_field in ["first_cert_date", "latest_cert_date"]:
                    if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                        row[date_field] = row[date_field].isoformat()
                # Handle list fields (cert_titles, exam_codes)
                for list_field in ["cert_titles", "exam_codes"]:
                    if row.get(list_field) and isinstance(row[list_field], list):
                        row[list_field] = ",".join(str(x) for x in row[list_field])
            
            count = save_csv("certified_users.csv", rows)
            
            # Log summary stats
            with_dotcom = sum(1 for r in rows if r.get("dotcom_id", 0) > 0)
            total_passed = sum(r.get("total_certs", 0) for r in rows)
            log(f"   Users with dotcom_id: {with_dotcom:,}/{len(rows):,}", "info")
            log(f"   Total certifications: {total_passed:,}", "info")
            
            update_sync_status("certified_users", "success", count)
    except Exception as e:
        log(f"Failed to sync certified users: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("certified_users", "error", error=str(e))


def sync_unified_users(client):
    """Sync all users with exam attempts (same as certified, broader view)."""
    log("Syncing unified users...")
    
    # For unified users, we use the same query but save to a different file
    # This provides the complete learner population including those still learning
    try:
        rows = execute_query(client, "ACE", CERTIFIED_USERS_WITH_IDS_QUERY, "unified_users")
        if rows:
            # Format data for CSV
            for row in rows:
                for date_field in ["first_cert_date", "latest_cert_date"]:
                    if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                        row[date_field] = row[date_field].isoformat()
                for list_field in ["cert_titles", "exam_codes"]:
                    if row.get(list_field) and isinstance(row[list_field], list):
                        row[list_field] = ",".join(str(x) for x in row[list_field])
            
            count = save_csv("unified_users.csv", rows)
            
            # Log status breakdown
            status_counts = {}
            for r in rows:
                status = r.get("learner_status", "Unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
            log(f"   Status breakdown: {status_counts}", "info")
            
            update_sync_status("unified_users", "success", count)
    except Exception as e:
        log(f"Failed to sync unified users: {e}", "error")
        update_sync_status("unified_users", "error", error=str(e))


def sync_individual_exams(client):
    """Sync individual exam records from both FY22-25 and FY26."""
    log("Syncing individual exams (FY22-25 + FY26)...")
    
    try:
        rows = execute_query(client, "ace", INDIVIDUAL_EXAMS_QUERY, "individual_exams")
        if rows:
            # Normalize exam names and format data
            CERT_NAME_MAP = {
                "ACTIONS": "GitHub Actions",
                "ADMIN": "GitHub Administration",
                "GHAS": "GitHub Advanced Security",
                "GHF": "GitHub Foundations",
                "COPILOT": "GitHub Copilot",
                "GH-100": "GitHub Administration",
                "GH-200": "GitHub Actions",
                "GH-300": "GitHub Copilot",
                "GH-400": "GitHub Advanced Security",
            }
            
            for row in rows:
                # Normalize exam name
                code = row.get("exam_code", "")
                if code and code.upper() in CERT_NAME_MAP:
                    row["exam_name"] = CERT_NAME_MAP[code.upper()]
                
                # Format date
                if row.get("exam_date") and hasattr(row["exam_date"], "isoformat"):
                    row["exam_date"] = row["exam_date"].isoformat()
                
                # Format score
                score = row.get("score_percent")
                if score is not None and score > 0:
                    row["score_percent"] = round(float(score), 1)
                else:
                    row["score_percent"] = ""
            
            count = save_csv("individual_exams.csv", rows)
            
            # Log status breakdown
            status_counts = {}
            for r in rows:
                status = r.get("exam_status", "Unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
            log(f"   Status breakdown: {status_counts}", "info")
            
            unique_emails = len(set(r.get("email", "") for r in rows))
            log(f"   Unique learners: {unique_emails:,}", "info")
            
            update_sync_status("individual_exams", "success", count)
    except Exception as e:
        log(f"Failed to sync individual exams: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("individual_exams", "error", error=str(e))


def sync_product_usage(client):
    """Sync product usage data from gh-analytics canonical database."""
    log("Syncing product usage...")
    
    try:
        rows = execute_query(client, "canonical", PRODUCT_USAGE_QUERY, "product_usage")
        if rows:
            # Format numeric fields
            for row in rows:
                for field in ["copilot_events", "copilot_days", "actions_events", "security_events", "total_events", "activity_days"]:
                    if row.get(field):
                        row[field] = int(row[field])
                if row.get("product_usage_hours"):
                    row["product_usage_hours"] = round(float(row["product_usage_hours"]), 2)
            
            count = save_csv("product_usage.csv", rows)
            
            # Log stats
            with_copilot = sum(1 for r in rows if r.get("copilot_events", 0) > 0)
            avg_copilot = sum(r.get("copilot_events", 0) for r in rows) / max(len(rows), 1)
            log(f"   Users with Copilot activity: {with_copilot:,}", "info")
            log(f"   Avg Copilot events: {avg_copilot:.1f}", "info")
            
            update_sync_status("product_usage", "success", count)
    except Exception as e:
        log(f"Failed to sync product usage: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("product_usage", "error", error=str(e))


def sync_learning_activity(client):
    """Sync learning activity from gh-analytics hydro database."""
    log("Syncing learning activity...")
    
    try:
        rows = execute_query(client, "hydro", LEARNING_ACTIVITY_QUERY, "learning_activity")
        if rows:
            # Format data
            for row in rows:
                for date_field in ["first_learning", "last_learning"]:
                    if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                        row[date_field] = row[date_field].isoformat()
                if row.get("learning_hours"):
                    row["learning_hours"] = round(float(row["learning_hours"]), 2)
            
            count = save_csv("learning_activity.csv", rows)
            
            # Log stats
            avg_hours = sum(r.get("learning_hours", 0) for r in rows) / max(len(rows), 1)
            log(f"   Avg learning hours: {avg_hours:.1f}", "info")
            
            update_sync_status("learning_activity", "success", count)
    except Exception as e:
        log(f"Failed to sync learning activity: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("learning_activity", "error", error=str(e))


# =============================================================================
# NEW: COMPREHENSIVE LEARNING DATA SYNC FUNCTIONS
# =============================================================================

def sync_github_learn(client):
    """Sync GitHub Learn (learn.github.com) engagement data."""
    log("Syncing GitHub Learn engagement...")
    
    try:
        rows = execute_query(client, "hydro", GITHUB_LEARN_QUERY, "github_learn")
        if rows:
            # Format data
            for row in rows:
                for date_field in ["first_learn_visit", "last_learn_visit"]:
                    if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                        row[date_field] = row[date_field].isoformat()
                # Handle list fields
                if row.get("content_types_viewed") and isinstance(row["content_types_viewed"], list):
                    row["content_types_viewed"] = ",".join(str(x) for x in row["content_types_viewed"])
            
            count = save_csv("github_learn.csv", rows)
            
            # Log stats
            total_views = sum(r.get("learn_page_views", 0) for r in rows)
            cert_viewers = sum(1 for r in rows if r.get("viewed_certifications", 0) > 0)
            log(f"   Total page views: {total_views:,}", "info")
            log(f"   Users who viewed certifications: {cert_viewers:,}", "info")
            
            update_sync_status("github_learn", "success", count)
    except Exception as e:
        log(f"Failed to sync GitHub Learn: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("github_learn", "error", error=str(e))


def sync_github_skills(client):
    """Sync GitHub Skills (skills/* repos) engagement data."""
    log("Syncing GitHub Skills engagement...")
    
    try:
        rows = execute_query(client, "hydro", GITHUB_SKILLS_QUERY, "github_skills")
        if rows:
            # Format data
            for row in rows:
                for date_field in ["first_skills_visit", "last_skills_visit"]:
                    if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                        row[date_field] = row[date_field].isoformat()
                # Handle list fields
                if row.get("skills_completed") and isinstance(row["skills_completed"], list):
                    row["skills_completed"] = ",".join(str(x) for x in row["skills_completed"])
            
            count = save_csv("github_skills.csv", rows)
            
            # Log stats
            total_views = sum(r.get("skills_page_views", 0) for r in rows)
            avg_skills = sum(r.get("skills_count", 0) for r in rows) / max(len(rows), 1)
            ai_learners = sum(1 for r in rows if r.get("ai_skills_views", 0) > 0)
            log(f"   Total page views: {total_views:,}", "info")
            log(f"   Avg skills per user: {avg_skills:.1f}", "info")
            log(f"   Users with AI/Copilot skills: {ai_learners:,}", "info")
            
            update_sync_status("github_skills", "success", count)
    except Exception as e:
        log(f"Failed to sync GitHub Skills: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("github_skills", "error", error=str(e))


def sync_github_docs(client):
    """Sync GitHub Docs (docs.github.com) engagement data."""
    log("Syncing GitHub Docs engagement...")
    
    try:
        rows = execute_query(client, "hydro", GITHUB_DOCS_QUERY, "github_docs")
        if rows:
            # Format data
            for row in rows:
                for date_field in ["first_docs_visit", "last_docs_visit"]:
                    if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                        row[date_field] = row[date_field].isoformat()
                # Handle list fields
                if row.get("docs_products_viewed") and isinstance(row["docs_products_viewed"], list):
                    row["docs_products_viewed"] = ",".join(str(x) for x in row["docs_products_viewed"])
            
            count = save_csv("github_docs.csv", rows)
            
            # Log stats
            total_views = sum(r.get("docs_page_views", 0) for r in rows)
            copilot_viewers = sum(1 for r in rows if r.get("copilot_docs_views", 0) > 0)
            actions_viewers = sum(1 for r in rows if r.get("actions_docs_views", 0) > 0)
            log(f"   Total page views: {total_views:,}", "info")
            log(f"   Users viewing Copilot docs: {copilot_viewers:,}", "info")
            log(f"   Users viewing Actions docs: {actions_viewers:,}", "info")
            
            update_sync_status("github_docs", "success", count)
    except Exception as e:
        log(f"Failed to sync GitHub Docs: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("github_docs", "error", error=str(e))


def sync_events(client):
    """Sync event registrations and attendance data."""
    log("Syncing event registrations...")
    
    try:
        rows = execute_query(client, "ace", EVENTS_QUERY, "events")
        if rows:
            # Format data
            for row in rows:
                for date_field in ["first_event_date", "last_event_date"]:
                    if row.get(date_field) and hasattr(row[date_field], "isoformat"):
                        row[date_field] = row[date_field].isoformat()
                # Handle list fields
                if row.get("event_categories") and isinstance(row["event_categories"], list):
                    row["event_categories"] = ",".join(str(x) for x in row["event_categories"])
            
            count = save_csv("events.csv", rows)
            
            # Log stats
            total_registered = sum(r.get("events_registered", 0) for r in rows)
            total_attended = sum(r.get("events_attended", 0) for r in rows)
            attendance_rate = total_attended / max(total_registered, 1) * 100
            log(f"   Total registrations: {total_registered:,}", "info")
            log(f"   Total attended: {total_attended:,}", "info")
            log(f"   Attendance rate: {attendance_rate:.1f}%", "info")
            
            update_sync_status("events", "success", count)
    except Exception as e:
        log(f"Failed to sync events: {e}", "error")
        import traceback
        traceback.print_exc()
        update_sync_status("events", "error", error=str(e))


# =============================================================================
# GITHUB API DATA SYNC
# =============================================================================

def sync_github_api_data():
    """Sync data from GitHub API."""
    log("Starting GitHub API data sync...", "start")
    
    github_token = os.getenv("GITHUB_TOKEN")
    github_org = os.getenv("GITHUB_ORG")
    
    if not github_token:
        log("GITHUB_TOKEN not set - skipping GitHub API sync", "warning")
        update_sync_status("github_api", "unavailable", error="GITHUB_TOKEN not set")
        return
    
    if not github_org:
        log("GITHUB_ORG not set - skipping org-specific metrics", "warning")
    
    # Sync Copilot metrics if org is set
    if github_org:
        sync_copilot_metrics(github_token, github_org)
    
    log("GitHub API sync complete!", "success")


def sync_copilot_metrics(token: str, org: str):
    """Sync Copilot metrics from GitHub API."""
    import requests
    
    log(f"Syncing Copilot metrics for {org}...")
    
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    
    # Get last 28 days of metrics
    since = (datetime.now() - timedelta(days=28)).strftime("%Y-%m-%d")
    url = f"https://api.github.com/orgs/{org}/copilot/metrics?since={since}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        if data:
            # Transform to flat CSV format
            rows = []
            for day in data:
                rows.append({
                    "date": day.get("date"),
                    "active_users": day.get("total_active_users", 0),
                    "engaged_users": day.get("total_engaged_users", 0),
                    "engagement_rate": round(day.get("total_engaged_users", 0) / max(day.get("total_active_users", 1), 1) * 100, 1),
                    "chats": sum(c.get("total_chats", 0) for c in day.get("copilot_ide_chat", {}).get("editors", [])) if day.get("copilot_ide_chat") else 0,
                    "pr_summaries": day.get("copilot_dotcom_pull_requests", {}).get("total_pr_summaries_created", 0) if day.get("copilot_dotcom_pull_requests") else 0,
                })
            
            count = save_csv("copilot_daily.csv", rows)
            update_sync_status("copilot_metrics", "success", count)
            
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            log("Copilot API: Access denied - need manage_billing:copilot scope", "error")
        elif e.response.status_code == 404:
            log("Copilot API: Org not found or Copilot not enabled", "error")
        else:
            log(f"Copilot API error: {e}", "error")
        update_sync_status("copilot_metrics", "error", error=str(e))
    except Exception as e:
        log(f"Failed to sync Copilot metrics: {e}", "error")
        update_sync_status("copilot_metrics", "error", error=str(e))


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Sync all data sources")
    parser.add_argument("--full", action="store_true", help="Force full refresh")
    parser.add_argument("--kusto-only", action="store_true", help="Only sync Kusto data")
    parser.add_argument("--github-only", action="store_true", help="Only sync GitHub API data")
    args = parser.parse_args()
    
    print("=" * 60)
    print("📊 Learning ROI Dashboard - Data Sync")
    print("=" * 60)
    print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📁 Data directory: {DATA_DIR}")
    print()
    
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    if args.github_only:
        sync_github_api_data()
    elif args.kusto_only:
        sync_kusto_data()
    else:
        sync_kusto_data()
        sync_github_api_data()
    
    print()
    print("=" * 60)
    print(f"✨ Sync completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Print sync status summary
    if SYNC_STATUS_FILE.exists():
        with open(SYNC_STATUS_FILE) as f:
            status = json.load(f)
        
        print("\n📋 Sync Status Summary:")
        for source, info in status.items():
            # Skip non-dict entries (legacy format)
            if not isinstance(info, dict):
                continue
            # Skip entries without status field
            if "status" not in info:
                continue
            status_icon = "✅" if info["status"] == "success" else "⚠️" if info["status"] == "skipped" else "❌"
            rows_str = f" ({info.get('rows', 0):,} rows)" if info.get("rows") else ""
            print(f"   {status_icon} {source}: {info['status']}{rows_str}")


if __name__ == "__main__":
    main()
