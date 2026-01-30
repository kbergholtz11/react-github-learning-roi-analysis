#!/usr/bin/env python3
"""
Fetch GitHub Activity Data for Learners

Pulls developer activity from GitHub to correlate with learning outcomes:
- Commits and contribution frequency
- Pull requests opened/merged
- Issues created
- Code review activity
- Repository contributions

Usage:
  export GITHUB_TOKEN="your-token-here"
  python scripts/fetch-github-activity.py

This script reads user handles from unified_users.csv and fetches their
public GitHub activity to enrich learning ROI analysis.
"""

import os
import json
import csv
from datetime import datetime, timedelta
from pathlib import Path
import requests
import time
from typing import Optional, List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
API_BASE = "https://api.github.com"
DATA_DIR = Path(__file__).parent.parent / "data"
MAX_WORKERS = 5  # Parallel API requests
RATE_LIMIT_BUFFER = 100  # Stop when this many requests remain


def get_headers():
    """Get API headers with authentication."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def check_rate_limit() -> tuple:
    """Check remaining API rate limit."""
    response = requests.get(f"{API_BASE}/rate_limit", headers=get_headers())
    if response.ok:
        data = response.json()
        core = data.get("resources", {}).get("core", {})
        return core.get("remaining", 0), core.get("reset", 0)
    return 0, 0


def fetch_user_events(username: str, max_pages: int = 3) -> List[Dict]:
    """
    Fetch recent events for a GitHub user.
    
    Returns list of events including:
    - PushEvent (commits)
    - PullRequestEvent
    - IssuesEvent
    - PullRequestReviewEvent
    - CreateEvent (branches/tags)
    """
    events = []
    
    for page in range(1, max_pages + 1):
        try:
            url = f"{API_BASE}/users/{username}/events"
            response = requests.get(
                url, 
                headers=get_headers(),
                params={"page": page, "per_page": 100}
            )
            
            if response.status_code == 404:
                return []  # User not found
            elif response.status_code == 403:
                return []  # Rate limited or forbidden
            
            response.raise_for_status()
            page_events = response.json()
            
            if not page_events:
                break
                
            events.extend(page_events)
            
            if len(page_events) < 100:
                break
                
        except requests.exceptions.RequestException:
            break
    
    return events


def fetch_user_repos(username: str) -> List[Dict]:
    """Fetch repositories a user has contributed to."""
    try:
        url = f"{API_BASE}/users/{username}/repos"
        response = requests.get(
            url,
            headers=get_headers(),
            params={"type": "all", "sort": "pushed", "per_page": 100}
        )
        
        if response.ok:
            return response.json()
    except requests.exceptions.RequestException:
        pass
    
    return []


def process_user_activity(username: str) -> Optional[Dict]:
    """
    Process all activity for a single user.
    
    Returns aggregated activity metrics.
    """
    events = fetch_user_events(username)
    
    if not events:
        return None
    
    # Initialize counters
    activity = {
        "handle": username,
        "total_events": len(events),
        "commits": 0,
        "commit_days": set(),
        "prs_opened": 0,
        "prs_merged": 0,
        "issues_opened": 0,
        "issues_closed": 0,
        "code_reviews": 0,
        "branches_created": 0,
        "repos_contributed": set(),
        "languages": {},
        "activity_days": set(),
        "first_activity": None,
        "last_activity": None,
    }
    
    for event in events:
        event_type = event.get("type", "")
        created_at = event.get("created_at", "")
        repo = event.get("repo", {}).get("name", "")
        
        if created_at:
            date = created_at[:10]
            activity["activity_days"].add(date)
            
            if not activity["last_activity"]:
                activity["last_activity"] = created_at
            activity["first_activity"] = created_at
        
        if repo:
            activity["repos_contributed"].add(repo)
        
        payload = event.get("payload", {})
        
        if event_type == "PushEvent":
            commits = payload.get("commits", [])
            activity["commits"] += len(commits)
            if created_at:
                activity["commit_days"].add(created_at[:10])
                
        elif event_type == "PullRequestEvent":
            action = payload.get("action", "")
            if action == "opened":
                activity["prs_opened"] += 1
            elif action == "closed" and payload.get("pull_request", {}).get("merged"):
                activity["prs_merged"] += 1
                
        elif event_type == "IssuesEvent":
            action = payload.get("action", "")
            if action == "opened":
                activity["issues_opened"] += 1
            elif action == "closed":
                activity["issues_closed"] += 1
                
        elif event_type == "PullRequestReviewEvent":
            activity["code_reviews"] += 1
            
        elif event_type == "CreateEvent":
            ref_type = payload.get("ref_type", "")
            if ref_type == "branch":
                activity["branches_created"] += 1
    
    # Convert sets to counts
    activity["commit_days"] = len(activity["commit_days"])
    activity["activity_days"] = len(activity["activity_days"])
    activity["repos_contributed"] = len(activity["repos_contributed"])
    
    return activity


def load_user_handles() -> List[str]:
    """Load user handles from unified_users.csv."""
    handles = []
    csv_path = DATA_DIR / "unified_users.csv"
    
    if not csv_path.exists():
        print(f"❌ File not found: {csv_path}")
        return handles
    
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            handle = row.get("user_handle", "").strip()
            if handle and handle != "":
                handles.append(handle)
    
    return handles


def save_activity_data(activities: List[Dict]):
    """Save activity data to CSV."""
    if not activities:
        print("⚠️  No activity data to save")
        return
    
    csv_path = DATA_DIR / "github_activity.csv"
    
    with open(csv_path, "w", newline="") as f:
        fieldnames = [
            "handle", "total_events", "commits", "commit_days", 
            "prs_opened", "prs_merged", "issues_opened", "issues_closed",
            "code_reviews", "branches_created", "repos_contributed",
            "activity_days", "first_activity", "last_activity"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for activity in activities:
            writer.writerow({k: v for k, v in activity.items() if k in fieldnames})
    
    print(f"✅ Saved {len(activities)} user activities to {csv_path}")
    
    # Also save as JSON with more detail
    json_path = DATA_DIR / "github_activity.json"
    with open(json_path, "w") as f:
        json.dump({
            "activities": activities,
            "total_users": len(activities),
            "generated_at": datetime.now().isoformat(),
        }, f, indent=2)
    print(f"✅ Saved JSON to {json_path}")


def main():
    """Main function to fetch GitHub activity for all learners."""
    print("\n🚀 Fetching GitHub Activity Data")
    print("=" * 50)
    
    # Check rate limit
    remaining, reset_time = check_rate_limit()
    print(f"📊 Rate limit remaining: {remaining}")
    
    if remaining < RATE_LIMIT_BUFFER:
        reset_dt = datetime.fromtimestamp(reset_time)
        print(f"❌ Rate limit too low. Resets at {reset_dt}")
        return
    
    # Load user handles
    handles = load_user_handles()
    if not handles:
        print("❌ No user handles found in unified_users.csv")
        return
    
    print(f"👥 Found {len(handles)} users to process")
    
    # Limit for testing/rate limits
    max_users = min(len(handles), remaining // 5)  # ~5 requests per user
    handles = handles[:max_users]
    print(f"📝 Processing {len(handles)} users (rate limit constraint)")
    
    # Fetch activity in parallel
    activities = []
    processed = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_user = {
            executor.submit(process_user_activity, handle): handle 
            for handle in handles
        }
        
        for future in as_completed(future_to_user):
            handle = future_to_user[future]
            processed += 1
            
            try:
                activity = future.result()
                if activity:
                    activities.append(activity)
                    
                if processed % 100 == 0:
                    print(f"   Processed {processed}/{len(handles)} users ({len(activities)} with activity)")
                    
            except Exception as e:
                print(f"   Error processing {handle}: {e}")
            
            # Brief pause to be nice to the API
            time.sleep(0.1)
    
    print(f"\n📈 Results:")
    print(f"   Users processed: {processed}")
    print(f"   Users with activity: {len(activities)}")
    
    if activities:
        total_commits = sum(a["commits"] for a in activities)
        total_prs = sum(a["prs_opened"] for a in activities)
        total_reviews = sum(a["code_reviews"] for a in activities)
        
        print(f"   Total commits: {total_commits:,}")
        print(f"   Total PRs opened: {total_prs:,}")
        print(f"   Total code reviews: {total_reviews:,}")
    
    # Save data
    print("\n💾 Saving data...")
    save_activity_data(activities)
    
    print("\n✨ Done!")


if __name__ == "__main__":
    main()
