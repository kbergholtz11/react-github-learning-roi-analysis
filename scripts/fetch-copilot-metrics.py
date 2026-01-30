#!/usr/bin/env python3
"""
Fetch GitHub Copilot Metrics

Pulls detailed Copilot usage metrics from the GitHub API including:
- Code suggestions and acceptance rates
- Language breakdowns
- Editor preferences
- Chat usage patterns

Usage:
  export GITHUB_TOKEN="your-token-here"
  export GITHUB_ORG="your-org-name"
  python scripts/fetch-copilot-metrics.py

Required token scopes: manage_billing:copilot, read:org, or read:enterprise
"""

import os
import json
import csv
from datetime import datetime, timedelta
from pathlib import Path
import requests
from typing import Optional

# Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_ORG = os.getenv("GITHUB_ORG")
API_BASE = "https://api.github.com"
DATA_DIR = Path(__file__).parent.parent / "data"


def get_headers():
    """Get API headers with authentication."""
    if not GITHUB_TOKEN:
        raise ValueError("GITHUB_TOKEN environment variable required")
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def fetch_copilot_metrics(org: str, since: Optional[str] = None, until: Optional[str] = None) -> list:
    """
    Fetch Copilot metrics for an organization.
    
    Returns daily aggregated metrics including:
    - total_active_users: Users with active Copilot license
    - total_engaged_users: Users who actually used Copilot
    - copilot_ide_code_completions: Code completion stats by language/editor
    - copilot_ide_chat: Chat usage in IDE
    - copilot_dotcom_chat: Chat usage on github.com
    - copilot_dotcom_pull_requests: PR summary usage
    """
    url = f"{API_BASE}/orgs/{org}/copilot/metrics"
    params = {}
    
    if since:
        params["since"] = since
    if until:
        params["until"] = until
    
    print(f"📊 Fetching Copilot metrics for {org}...")
    
    try:
        response = requests.get(url, headers=get_headers(), params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            print("❌ Access denied. Ensure your token has 'manage_billing:copilot' or 'read:org' scope")
        elif e.response.status_code == 404:
            print("❌ Organization not found or Copilot not enabled")
        elif e.response.status_code == 422:
            print("❌ Copilot Usage Metrics API is disabled. Enable it in org settings.")
        else:
            print(f"❌ API error: {e}")
        return []


def fetch_copilot_seats(org: str) -> list:
    """
    Fetch Copilot seat assignments to get per-user data.
    
    Returns list of users with:
    - login: GitHub username
    - created_at: When seat was assigned
    - last_activity_at: Last Copilot usage
    - last_activity_editor: Which IDE was used
    """
    url = f"{API_BASE}/orgs/{org}/copilot/billing/seats"
    all_seats = []
    page = 1
    
    print(f"👥 Fetching Copilot seat assignments...")
    
    while True:
        try:
            response = requests.get(
                url, 
                headers=get_headers(), 
                params={"page": page, "per_page": 100}
            )
            response.raise_for_status()
            data = response.json()
            
            seats = data.get("seats", [])
            if not seats:
                break
                
            all_seats.extend(seats)
            print(f"   Page {page}: {len(seats)} seats")
            
            if len(seats) < 100:
                break
            page += 1
            
        except requests.exceptions.HTTPError as e:
            print(f"❌ Error fetching seats: {e}")
            break
    
    return all_seats


def process_daily_metrics(metrics: list) -> dict:
    """Process daily metrics into aggregated summary."""
    if not metrics:
        return {}
    
    summary = {
        "total_days": len(metrics),
        "date_range": {
            "start": metrics[-1].get("date") if metrics else None,
            "end": metrics[0].get("date") if metrics else None,
        },
        "totals": {
            "active_users": 0,
            "engaged_users": 0,
            "code_suggestions": 0,
            "code_acceptances": 0,
            "code_lines_suggested": 0,
            "code_lines_accepted": 0,
            "chats": 0,
            "pr_summaries": 0,
        },
        "languages": {},
        "editors": {},
        "daily_data": [],
    }
    
    for day in metrics:
        date = day.get("date")
        active = day.get("total_active_users", 0)
        engaged = day.get("total_engaged_users", 0)
        
        daily = {
            "date": date,
            "active_users": active,
            "engaged_users": engaged,
            "engagement_rate": round(engaged / active * 100, 1) if active > 0 else 0,
        }
        
        summary["totals"]["active_users"] = max(summary["totals"]["active_users"], active)
        summary["totals"]["engaged_users"] = max(summary["totals"]["engaged_users"], engaged)
        
        # Process code completions
        completions = day.get("copilot_ide_code_completions", {})
        if completions:
            for editor in completions.get("editors", []):
                editor_name = editor.get("name", "unknown")
                if editor_name not in summary["editors"]:
                    summary["editors"][editor_name] = {"users": 0, "suggestions": 0, "acceptances": 0}
                summary["editors"][editor_name]["users"] = max(
                    summary["editors"][editor_name]["users"],
                    editor.get("total_engaged_users", 0)
                )
                
                for model in editor.get("models", []):
                    for lang in model.get("languages", []):
                        lang_name = lang.get("name", "unknown")
                        suggestions = lang.get("total_code_suggestions", 0)
                        acceptances = lang.get("total_code_acceptances", 0)
                        lines_suggested = lang.get("total_code_lines_suggested", 0)
                        lines_accepted = lang.get("total_code_lines_accepted", 0)
                        
                        if lang_name not in summary["languages"]:
                            summary["languages"][lang_name] = {
                                "users": 0,
                                "suggestions": 0,
                                "acceptances": 0,
                                "lines_suggested": 0,
                                "lines_accepted": 0,
                            }
                        
                        summary["languages"][lang_name]["users"] = max(
                            summary["languages"][lang_name]["users"],
                            lang.get("total_engaged_users", 0)
                        )
                        summary["languages"][lang_name]["suggestions"] += suggestions
                        summary["languages"][lang_name]["acceptances"] += acceptances
                        summary["languages"][lang_name]["lines_suggested"] += lines_suggested
                        summary["languages"][lang_name]["lines_accepted"] += lines_accepted
                        
                        summary["totals"]["code_suggestions"] += suggestions
                        summary["totals"]["code_acceptances"] += acceptances
                        summary["totals"]["code_lines_suggested"] += lines_suggested
                        summary["totals"]["code_lines_accepted"] += lines_accepted
        
        # Process chat usage
        ide_chat = day.get("copilot_ide_chat", {})
        dotcom_chat = day.get("copilot_dotcom_chat", {})
        
        chat_count = 0
        for editor in ide_chat.get("editors", []):
            for model in editor.get("models", []):
                chat_count += model.get("total_chats", 0)
        for model in dotcom_chat.get("models", []):
            chat_count += model.get("total_chats", 0)
        
        daily["chats"] = chat_count
        summary["totals"]["chats"] += chat_count
        
        # Process PR summaries
        pr_data = day.get("copilot_dotcom_pull_requests", {})
        pr_count = 0
        for repo in pr_data.get("repositories", []):
            for model in repo.get("models", []):
                pr_count += model.get("total_pr_summaries_created", 0)
        
        daily["pr_summaries"] = pr_count
        summary["totals"]["pr_summaries"] += pr_count
        
        summary["daily_data"].append(daily)
    
    # Calculate acceptance rate
    if summary["totals"]["code_suggestions"] > 0:
        summary["totals"]["acceptance_rate"] = round(
            summary["totals"]["code_acceptances"] / summary["totals"]["code_suggestions"] * 100, 1
        )
    else:
        summary["totals"]["acceptance_rate"] = 0
    
    # Calculate per-language acceptance rates
    for lang, data in summary["languages"].items():
        if data["suggestions"] > 0:
            data["acceptance_rate"] = round(data["acceptances"] / data["suggestions"] * 100, 1)
        else:
            data["acceptance_rate"] = 0
    
    return summary


def save_copilot_data(metrics_summary: dict, seats: list):
    """Save Copilot data to CSV and JSON files."""
    DATA_DIR.mkdir(exist_ok=True)
    
    # Save full metrics summary as JSON
    json_path = DATA_DIR / "copilot_metrics.json"
    with open(json_path, "w") as f:
        json.dump({
            "summary": metrics_summary,
            "generated_at": datetime.now().isoformat(),
        }, f, indent=2)
    print(f"✅ Saved metrics summary to {json_path}")
    
    # Save daily data as CSV
    if metrics_summary.get("daily_data"):
        csv_path = DATA_DIR / "copilot_daily.csv"
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "date", "active_users", "engaged_users", "engagement_rate", "chats", "pr_summaries"
            ])
            writer.writeheader()
            writer.writerows(metrics_summary["daily_data"])
        print(f"✅ Saved daily metrics to {csv_path}")
    
    # Save language breakdown as CSV
    if metrics_summary.get("languages"):
        csv_path = DATA_DIR / "copilot_languages.csv"
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["language", "users", "suggestions", "acceptances", "acceptance_rate", "lines_suggested", "lines_accepted"])
            for lang, data in sorted(metrics_summary["languages"].items(), key=lambda x: x[1]["acceptances"], reverse=True):
                writer.writerow([
                    lang,
                    data["users"],
                    data["suggestions"],
                    data["acceptances"],
                    data["acceptance_rate"],
                    data["lines_suggested"],
                    data["lines_accepted"],
                ])
        print(f"✅ Saved language breakdown to {csv_path}")
    
    # Save seat assignments as CSV
    if seats:
        csv_path = DATA_DIR / "copilot_seats.csv"
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["login", "created_at", "last_activity_at", "last_activity_editor"])
            for seat in seats:
                assignee = seat.get("assignee", {})
                writer.writerow([
                    assignee.get("login", ""),
                    seat.get("created_at", ""),
                    seat.get("last_activity_at", ""),
                    seat.get("last_activity_editor", ""),
                ])
        print(f"✅ Saved {len(seats)} seat assignments to {csv_path}")


def main():
    """Main function to fetch and save Copilot metrics."""
    if not GITHUB_TOKEN:
        print("❌ Error: GITHUB_TOKEN environment variable required")
        print("   Export your token: export GITHUB_TOKEN='ghp_...'")
        return
    
    if not GITHUB_ORG:
        print("❌ Error: GITHUB_ORG environment variable required")
        print("   Export your org: export GITHUB_ORG='your-org-name'")
        return
    
    print(f"\n🚀 Fetching Copilot data for organization: {GITHUB_ORG}")
    print("=" * 50)
    
    # Fetch last 100 days of metrics
    since = (datetime.now() - timedelta(days=100)).strftime("%Y-%m-%dT00:00:00Z")
    metrics = fetch_copilot_metrics(GITHUB_ORG, since=since)
    
    if metrics:
        print(f"   Retrieved {len(metrics)} days of metrics")
        summary = process_daily_metrics(metrics)
        
        print(f"\n📈 Summary:")
        print(f"   Active Users: {summary['totals']['active_users']}")
        print(f"   Engaged Users: {summary['totals']['engaged_users']}")
        print(f"   Code Suggestions: {summary['totals']['code_suggestions']:,}")
        print(f"   Acceptance Rate: {summary['totals']['acceptance_rate']}%")
        print(f"   Total Chats: {summary['totals']['chats']:,}")
        print(f"   PR Summaries: {summary['totals']['pr_summaries']:,}")
        
        if summary.get("languages"):
            print(f"\n🔤 Top Languages:")
            for lang, data in sorted(summary["languages"].items(), key=lambda x: x[1]["acceptances"], reverse=True)[:5]:
                print(f"   {lang}: {data['acceptance_rate']}% acceptance ({data['acceptances']:,} accepted)")
    else:
        summary = {}
    
    # Fetch seat assignments
    seats = fetch_copilot_seats(GITHUB_ORG)
    
    # Save all data
    print("\n💾 Saving data...")
    save_copilot_data(summary, seats)
    
    print("\n✨ Done!")


if __name__ == "__main__":
    main()
