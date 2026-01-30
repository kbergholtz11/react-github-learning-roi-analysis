#!/usr/bin/env python3
"""
Fetch GitHub Skills Course Progress

Tracks completion of GitHub Skills interactive courses:
- Course starts and completions
- Time to complete
- Popular learning paths

Usage:
  export GITHUB_TOKEN="your-token-here"
  python scripts/fetch-skills-progress.py

This script checks which users have forked/completed GitHub Skills courses
from skills.github.com to track hands-on learning.
"""

import os
import json
import csv
from datetime import datetime
from pathlib import Path
import requests
from typing import List, Dict, Optional
import time

# Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
API_BASE = "https://api.github.com"
DATA_DIR = Path(__file__).parent.parent / "data"

# Official GitHub Skills courses (from github.com/skills)
SKILLS_COURSES = [
    # Copilot Courses
    {"repo": "skills/getting-started-with-github-copilot", "name": "Getting Started with GitHub Copilot", "category": "Copilot", "difficulty": "beginner"},
    {"repo": "skills/integrate-mcp-with-copilot", "name": "Integrate MCP with Copilot", "category": "Copilot", "difficulty": "intermediate"},
    {"repo": "skills/expand-your-team-with-copilot", "name": "Expand Your Team with Copilot", "category": "Copilot", "difficulty": "intermediate"},
    {"repo": "skills/customize-your-github-copilot-experience", "name": "Customize Copilot Experience", "category": "Copilot", "difficulty": "advanced"},
    {"repo": "skills/copilot-code-review", "name": "Copilot Code Review", "category": "Copilot", "difficulty": "intermediate"},
    {"repo": "skills/create-ai-powered-actions", "name": "Create AI-Powered Actions", "category": "Copilot", "difficulty": "advanced"},
    {"repo": "skills/ai-in-actions", "name": "AI in Actions", "category": "Copilot", "difficulty": "intermediate"},
    
    # GitHub Actions Courses
    {"repo": "skills/hello-github-actions", "name": "Hello GitHub Actions", "category": "Actions", "difficulty": "beginner"},
    {"repo": "skills/write-javascript-actions", "name": "Write JavaScript Actions", "category": "Actions", "difficulty": "intermediate"},
    {"repo": "skills/publish-docker-images", "name": "Publish Docker Images", "category": "Actions", "difficulty": "intermediate"},
    {"repo": "skills/reusable-workflows", "name": "Reusable Workflows", "category": "Actions", "difficulty": "intermediate"},
    {"repo": "skills/continuous-integration", "name": "Continuous Integration", "category": "Actions", "difficulty": "intermediate"},
    {"repo": "skills/test-with-actions", "name": "Test with Actions", "category": "Actions", "difficulty": "intermediate"},
    
    # Git & GitHub Fundamentals
    {"repo": "skills/introduction-to-github", "name": "Introduction to GitHub", "category": "Fundamentals", "difficulty": "beginner"},
    {"repo": "skills/introduction-to-git", "name": "Introduction to Git", "category": "Fundamentals", "difficulty": "beginner"},
    {"repo": "skills/communicate-using-markdown", "name": "Communicate Using Markdown", "category": "Fundamentals", "difficulty": "beginner"},
    {"repo": "skills/github-pages", "name": "GitHub Pages", "category": "Fundamentals", "difficulty": "beginner"},
    {"repo": "skills/review-pull-requests", "name": "Review Pull Requests", "category": "Fundamentals", "difficulty": "beginner"},
    {"repo": "skills/resolve-merge-conflicts", "name": "Resolve Merge Conflicts", "category": "Fundamentals", "difficulty": "intermediate"},
    
    # Security Courses
    {"repo": "skills/introduction-to-secret-scanning", "name": "Introduction to Secret Scanning", "category": "Security", "difficulty": "beginner"},
    {"repo": "skills/secure-code-game", "name": "Secure Code Game", "category": "Security", "difficulty": "intermediate"},
    {"repo": "skills/introduction-to-codeql", "name": "Introduction to CodeQL", "category": "Security", "difficulty": "intermediate"},
    
    # Advanced Topics
    {"repo": "skills/release-based-workflow", "name": "Release Based Workflow", "category": "Advanced", "difficulty": "intermediate"},
    {"repo": "skills/connect-the-dots", "name": "Connect the Dots", "category": "Advanced", "difficulty": "advanced"},
    {"repo": "skills/code-with-codespaces", "name": "Code with Codespaces", "category": "Advanced", "difficulty": "beginner"},
]


def get_headers():
    """Get API headers with authentication."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def fetch_course_forks(course_repo: str, max_pages: int = 10) -> List[Dict]:
    """
    Fetch all forks of a skills course repository.
    
    Each fork represents a user starting the course.
    """
    forks = []
    
    for page in range(1, max_pages + 1):
        try:
            url = f"{API_BASE}/repos/{course_repo}/forks"
            response = requests.get(
                url,
                headers=get_headers(),
                params={"page": page, "per_page": 100, "sort": "newest"}
            )
            
            if response.status_code == 404:
                return []  # Course not found
            
            response.raise_for_status()
            page_forks = response.json()
            
            if not page_forks:
                break
            
            forks.extend(page_forks)
            
            if len(page_forks) < 100:
                break
                
            time.sleep(0.5)  # Rate limiting
            
        except requests.exceptions.RequestException as e:
            print(f"   Error fetching forks for {course_repo}: {e}")
            break
    
    return forks


def check_course_completion(owner: str, repo_name: str) -> Dict:
    """
    Check if a user completed a skills course.
    
    Completion indicators:
    - Has commits beyond the initial fork
    - Has closed/merged PRs
    - README shows completion badge
    """
    completion = {
        "has_activity": False,
        "commit_count": 0,
        "last_pushed": None,
        "likely_completed": False,
    }
    
    try:
        # Check repository activity
        url = f"{API_BASE}/repos/{owner}/{repo_name}"
        response = requests.get(url, headers=get_headers())
        
        if response.ok:
            repo_data = response.json()
            completion["last_pushed"] = repo_data.get("pushed_at")
            
            # Check commits
            commits_url = f"{API_BASE}/repos/{owner}/{repo_name}/commits"
            commits_response = requests.get(
                commits_url, 
                headers=get_headers(),
                params={"per_page": 10}
            )
            
            if commits_response.ok:
                commits = commits_response.json()
                completion["commit_count"] = len(commits)
                # If user has made commits beyond the template, they've started
                if len(commits) > 1:
                    completion["has_activity"] = True
                # Multiple commits suggest progress/completion
                if len(commits) >= 5:
                    completion["likely_completed"] = True
                    
    except requests.exceptions.RequestException:
        pass
    
    return completion


def load_user_handles() -> set:
    """Load user handles from unified_users.csv."""
    handles = set()
    csv_path = DATA_DIR / "unified_users.csv"
    
    if csv_path.exists():
        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                handle = row.get("user_handle", "").strip().lower()
                if handle:
                    handles.add(handle)
    
    return handles


def main():
    """Main function to fetch GitHub Skills progress."""
    print("\n🎓 Fetching GitHub Skills Course Progress")
    print("=" * 50)
    
    if not GITHUB_TOKEN:
        print("⚠️  No GITHUB_TOKEN set. API rate limits will be strict.")
        print("   Set token: export GITHUB_TOKEN='ghp_...'")
    
    # Load known user handles for filtering
    known_users = load_user_handles()
    print(f"👥 Loaded {len(known_users)} known users from unified_users.csv")
    
    # Track all enrollments
    all_enrollments = []
    course_stats = []
    
    for course in SKILLS_COURSES:
        repo = course["repo"]
        name = course["name"]
        
        print(f"\n📚 {name}")
        print(f"   Fetching forks from {repo}...")
        
        forks = fetch_course_forks(repo)
        
        if not forks:
            print(f"   No forks found")
            course_stats.append({
                "course": name,
                "repo": repo,
                "category": course["category"],
                "difficulty": course["difficulty"],
                "total_forks": 0,
                "known_learners": 0,
                "completed": 0,
            })
            continue
        
        print(f"   Found {len(forks)} forks")
        
        # Track course-level stats
        known_learner_count = 0
        completed_count = 0
        
        for fork in forks:
            owner = fork.get("owner", {})
            username = owner.get("login", "").lower()
            
            # Check if this is one of our known learners
            is_known = username in known_users
            if is_known:
                known_learner_count += 1
            
            # Create enrollment record
            enrollment = {
                "handle": username,
                "course": name,
                "course_repo": repo,
                "category": course["category"],
                "difficulty": course["difficulty"],
                "fork_created": fork.get("created_at"),
                "fork_updated": fork.get("updated_at"),
                "is_known_learner": is_known,
            }
            
            # Check completion for known learners (rate limit friendly)
            if is_known and len([e for e in all_enrollments if e["is_known_learner"]]) < 500:
                repo_name = fork.get("name", "")
                completion = check_course_completion(username, repo_name)
                enrollment["has_activity"] = completion["has_activity"]
                enrollment["likely_completed"] = completion["likely_completed"]
                enrollment["commit_count"] = completion["commit_count"]
                
                if completion["likely_completed"]:
                    completed_count += 1
                
                time.sleep(0.3)  # Rate limiting
            
            all_enrollments.append(enrollment)
        
        course_stats.append({
            "course": name,
            "repo": repo,
            "category": course["category"],
            "difficulty": course["difficulty"],
            "total_forks": len(forks),
            "known_learners": known_learner_count,
            "completed": completed_count,
        })
        
        print(f"   Known learners: {known_learner_count}")
        if completed_count > 0:
            print(f"   Likely completed: {completed_count}")
    
    # Save course stats
    print("\n💾 Saving data...")
    
    stats_path = DATA_DIR / "skills_courses.csv"
    with open(stats_path, "w", newline="") as f:
        fieldnames = ["course", "repo", "category", "difficulty", "total_forks", "known_learners", "completed"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(course_stats)
    print(f"✅ Saved course stats to {stats_path}")
    
    # Save enrollments for known learners
    known_enrollments = [e for e in all_enrollments if e["is_known_learner"]]
    if known_enrollments:
        enrollments_path = DATA_DIR / "skills_enrollments.csv"
        with open(enrollments_path, "w", newline="") as f:
            fieldnames = ["handle", "course", "category", "difficulty", "fork_created", "has_activity", "likely_completed", "commit_count"]
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(known_enrollments)
        print(f"✅ Saved {len(known_enrollments)} learner enrollments to {enrollments_path}")
    
    # Save full JSON
    json_path = DATA_DIR / "skills_progress.json"
    with open(json_path, "w") as f:
        json.dump({
            "course_stats": course_stats,
            "total_courses": len(SKILLS_COURSES),
            "total_enrollments": len(all_enrollments),
            "known_learner_enrollments": len(known_enrollments),
            "generated_at": datetime.now().isoformat(),
        }, f, indent=2)
    print(f"✅ Saved JSON to {json_path}")
    
    # Summary
    print("\n📊 Summary:")
    print(f"   Total courses tracked: {len(SKILLS_COURSES)}")
    print(f"   Total enrollments found: {len(all_enrollments):,}")
    print(f"   Known learner enrollments: {len(known_enrollments)}")
    
    # Top courses
    top_courses = sorted(course_stats, key=lambda x: x["total_forks"], reverse=True)[:5]
    print("\n🏆 Most Popular Courses:")
    for c in top_courses:
        print(f"   {c['course']}: {c['total_forks']:,} forks ({c['known_learners']} known learners)")
    
    # Category breakdown
    print("\n📁 By Category:")
    categories = {}
    for c in course_stats:
        cat = c["category"]
        if cat not in categories:
            categories[cat] = {"total": 0, "known": 0}
        categories[cat]["total"] += c["total_forks"]
        categories[cat]["known"] += c["known_learners"]
    
    for cat, data in sorted(categories.items(), key=lambda x: x[1]["total"], reverse=True):
        print(f"   {cat}: {data['total']:,} total ({data['known']} known)")
    
    print("\n✨ Done!")


if __name__ == "__main__":
    main()
