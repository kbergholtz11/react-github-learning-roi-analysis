#!/usr/bin/env python3
"""
Unified Data Sync Script

Syncs all data sources for the Learning ROI Dashboard:
- Kusto: Certification data, exam records, learning activity
- GitHub API: Copilot metrics, activity data, skills progress

Usage:
  python scripts/sync-all-data.py [--full]

Options:
  --full    Force full refresh (ignore cache)
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add parent/backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

DATA_DIR = Path(__file__).parent.parent / "data"
SYNC_STATUS_FILE = DATA_DIR / "sync_status.json"


def log(msg: str, level: str = "info"):
    """Print a log message with timestamp."""
    icons = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "error": "❌", "start": "🚀"}
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


# =============================================================================
# KUSTO DATA SYNC
# =============================================================================

def sync_kusto_data():
    """Sync data from Kusto clusters."""
    log("Starting Kusto data sync...", "start")
    
    try:
        from app.kusto import get_kusto_service
        from app.config import CLUSTER_CSE, CLUSTER_GH
        
        kusto = get_kusto_service()
        if not kusto.is_available:
            log("Kusto not available - skipping", "warning")
            update_sync_status("kusto", "unavailable")
            return
        
        # Sync certified users
        sync_certified_users(kusto)
        
        # Sync unified users
        sync_unified_users(kusto)
        
        # Sync individual exams
        sync_individual_exams(kusto)
        
        # Sync product usage
        sync_product_usage(kusto)
        
        # Sync learning activity
        sync_learning_activity(kusto)
        
        log("Kusto sync complete!", "success")
        
    except Exception as e:
        log(f"Kusto sync failed: {e}", "error")
        update_sync_status("kusto", "error", error=str(e))


def sync_certified_users(kusto):
    """Sync certified users from Kusto."""
    log("Syncing certified users...")
    
    query = """
    cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
    | where ['Total Passed'] > 0
    | summarize 
        first_cert_date = min(Date),
        latest_cert_date = max(Date),
        total_certs = count(),
        cert_titles = make_set(['Exam Title'])
    by email = tolower(['Candidate Email'])
    | extend 
        dotcom_id = 0,
        user_handle = split(email, '@')[0],
        learner_status = iff(total_certs >= 3, 'Multi-Certified', iff(total_certs >= 2, 'Dual-Certified', 'Certified')),
        journey_stage = strcat('Stage ', min_of(9, total_certs + 5)),
        days_since_cert = datetime_diff('day', now(), latest_cert_date)
    | project email, dotcom_id, user_handle, learner_status, journey_stage, 
        first_cert_date, latest_cert_date, total_certs, cert_titles, days_since_cert
    | order by total_certs desc
    """
    
    try:
        rows = kusto.execute_query(query, cluster="cse")
        if rows:
            count = save_csv("certified_users.csv", rows)
            update_sync_status("certified_users", "success", count)
    except Exception as e:
        log(f"Failed to sync certified users: {e}", "error")
        update_sync_status("certified_users", "error", error=str(e))


def sync_unified_users(kusto):
    """Sync all users with exam attempts from Kusto."""
    log("Syncing unified users...")
    
    query = """
    cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
    | summarize 
        total_attempts = count(),
        total_passed = countif(['Total Passed'] > 0),
        total_failed = countif(['Total Failed'] > 0),
        total_no_shows = countif(['Registration Status'] == 'No Show'),
        total_scheduled = countif(['Registration Status'] == 'Scheduled'),
        total_canceled = countif(['Registration Status'] == 'Canceled')
    by email = tolower(['Candidate Email'])
    | extend 
        dotcom_id = 0,
        user_handle = split(email, '@')[0]
    | project email, dotcom_id, user_handle, total_attempts, total_passed, 
        total_failed, total_no_shows, total_scheduled, total_canceled
    | order by total_attempts desc
    """
    
    try:
        rows = kusto.execute_query(query, cluster="cse")
        if rows:
            count = save_csv("unified_users.csv", rows)
            update_sync_status("unified_users", "success", count)
    except Exception as e:
        log(f"Failed to sync unified users: {e}", "error")
        update_sync_status("unified_users", "error", error=str(e))


def sync_individual_exams(kusto):
    """Sync individual exam records from Kusto."""
    log("Syncing individual exams...")
    
    query = """
    cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
    | extend 
        email = tolower(['Candidate Email']),
        exam_code = ['Exam Series Code'],
        exam_name = ['Exam Title'],
        exam_date = Date,
        exam_status = case(
            ['Total Passed'] > 0, "Passed",
            ['Total Failed'] > 0, "Failed",
            ['Registration Status'] == "No Show", "No Show",
            ['Registration Status'] == "Scheduled", "Scheduled",
            ['Registration Status'] == "Canceled", "Canceled",
            ['Registration Status']
        ),
        score_percent = todouble(Score),
        source = "FY26"
    | project email, exam_code, exam_name, exam_date, exam_status, score_percent, source
    | order by email, exam_date asc
    """
    
    try:
        rows = kusto.execute_query(query, cluster="cse")
        if rows:
            count = save_csv("individual_exams.csv", rows)
            update_sync_status("individual_exams", "success", count)
    except Exception as e:
        log(f"Failed to sync individual exams: {e}", "error")
        update_sync_status("individual_exams", "error", error=str(e))


def sync_product_usage(kusto):
    """Sync product usage data from Kusto."""
    log("Syncing product usage...")
    
    # This would need a specific query based on available tables
    # For now, we'll skip if no product usage table exists
    log("Product usage sync not implemented - using existing data", "warning")
    update_sync_status("product_usage", "skipped")


def sync_learning_activity(kusto):
    """Sync learning activity from Kusto."""
    log("Syncing learning activity...")
    
    # This would need a specific query based on available tables
    log("Learning activity sync not implemented - using existing data", "warning")
    update_sync_status("learning_activity", "skipped")


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
