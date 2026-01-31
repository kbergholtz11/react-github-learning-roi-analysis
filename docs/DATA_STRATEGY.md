# Data Strategy

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA FLOW ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐     ┌──────────────────┐                      │
│  │   KUSTO CLUSTERS │     │   GITHUB API     │                      │
│  │                  │     │                  │                      │
│  │  • cse-analytics │     │  • Copilot API   │                      │
│  │    (ACE db)      │     │  • Events API    │                      │
│  │                  │     │  • Skills repos  │                      │
│  │  • gh-analytics  │     │                  │                      │
│  │    (ace db)      │     │                  │                      │
│  └────────┬─────────┘     └────────┬─────────┘                      │
│           │                        │                                │
│           ▼                        ▼                                │
│  ┌─────────────────────────────────────────────┐                    │
│  │           sync-all-data.py                  │                    │
│  │  • Syncs data nightly or on-demand          │                    │
│  │  • Handles rate limiting                    │                    │
│  │  • Updates sync_status.json                 │                    │
│  └────────────────────┬────────────────────────┘                    │
│                       │                                             │
│                       ▼                                             │
│  ┌─────────────────────────────────────────────┐                    │
│  │              CSV FILES (data/)              │                    │
│  │  Pre-aggregated data for fast queries       │                    │
│  └────────────────────┬────────────────────────┘                    │
│                       │                                             │
│                       ▼                                             │
│  ┌─────────────────────────────────────────────┐                    │
│  │           FastAPI Backend                   │                    │
│  │  • Tries Kusto first (live data)            │                    │
│  │  • Falls back to CSV (cached data)          │                    │
│  │  • 5-minute query cache                     │                    │
│  └────────────────────┬────────────────────────┘                    │
│                       │                                             │
│                       ▼                                             │
│  ┌─────────────────────────────────────────────┐                    │
│  │           Next.js Frontend                  │                    │
│  │  • Aggregated JSON for dashboards           │                    │
│  │  • React Query for client caching           │                    │
│  └─────────────────────────────────────────────┘                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Sources

### Primary: Kusto (Azure Data Explorer)

| Cluster | Database | Purpose |
|---------|----------|---------|
| `cse-analytics.centralus.kusto.windows.net` | ACE | FY26 Pearson exam results |
| `gh-analytics.eastus.kusto.windows.net` | ace | FY22-25 exam eligibility, scheduling, results |
| `gh-analytics.eastus.kusto.windows.net` | copilot | Copilot telemetry (if available) |

### Secondary: GitHub API

| Endpoint | Data | Rate Limit |
|----------|------|------------|
| `/orgs/{org}/copilot/metrics` | Copilot usage stats | 60/hour |
| `/users/{username}/events` | User activity | 60/hour (unauthenticated) |
| `/repos/skills/{repo}/forks` | Skills course enrollments | 60/hour |

### CSV Files (Cached Data)

| File | Source | Refresh |
|------|--------|---------|
| `certified_users.csv` | Kusto | Nightly |
| `unified_users.csv` | Kusto | Nightly |
| `individual_exams.csv` | Kusto | Nightly |
| `product_usage.csv` | Kusto | Nightly |
| `copilot_daily.csv` | GitHub API | Nightly |
| `copilot_languages.csv` | GitHub API | Nightly |
| `github_activity.csv` | GitHub API | Weekly |
| `skills_enrollments.csv` | GitHub API | Weekly |
| `skills_courses.csv` | GitHub API | Weekly |
| `learning_activity.csv` | Kusto | Nightly |
| `journey_complete.csv` | Synthetic | Manual |

## Product Usage Time Windows

Product usage data is now tracked for **10 products** across multiple time windows to capture both active and occasional users:

### Tracked Products

| Category | Product | Skill Assessment |
|----------|---------|------------------|
| **Advanced Tools** | Copilot, Security | AI-assisted development, security practices |
| **CI/CD** | Actions | Automation and deployment skills |
| **Collaboration** | Pull Requests, Issues | Code review and project management |
| **Ecosystem** | Packages, Projects, Discussions, Pages, Code Search | Full platform proficiency |

### Time Windows

| Window | Purpose | Fields |
|--------|---------|--------|
| 90-day | Current active users | `uses_copilot`, `copilot_days_90d`, `copilot_events_90d` |
| 180-day | Captures bi-monthly users | `copilot_days_180d`, `copilot_events_180d` |
| 365-day | Full year, all occasional users | `copilot_days`, `copilot_ever_used` |

### Skill Maturity Score (0-100)

Learners receive a skill maturity score based on products adopted:

| Level | Score | Products Used |
|-------|-------|---------------|
| **Expert** | 80-100 | Uses most/all products including ecosystem |
| **Advanced** | 60-79 | Uses advanced tools + CI/CD + collaboration |
| **Intermediate** | 40-59 | Uses CI/CD + some collaboration |
| **Beginner** | 20-39 | Uses basic collaboration tools |
| **Novice** | 0-19 | Limited product usage |

### Score Components

- **Level 1 (25 pts)**: Basic GitHub - Pull Requests (15) + Issues (10)
- **Level 2 (25 pts)**: CI/CD - Actions (25)
- **Level 3 (25 pts)**: Advanced Tools - Copilot (15) + Security (10)
- **Level 4 (25 pts)**: Ecosystem - Packages (6) + Projects (5) + Discussions (5) + Pages (4) + Code Search (5)

### "Ever Used" vs "Active" Flags

- **`uses_copilot`** (90-day): Backward compatible flag for "currently active" users
- **`copilot_ever_used`** (365-day): Captures occasional users who may be missed by 90-day window
- **`copilot_usage_recency`**: Classification (`active_90d`, `active_180d`, `active_365d`, `never`)

### Impact on Metrics

The 90-day window may undercount Copilot adoption by ~30-50% for occasional users. Use:
- **90-day rates** for "active adoption" metrics and engagement
- **365-day rates** for "penetration" and "reach" metrics
- **Recency breakdown** to understand usage patterns
- **Skill maturity score** for holistic learner assessment

## Sync Strategy

### Live Data (Real-time)
Used for:
- User-specific profiles (exam history)
- Current metrics that need to be fresh

How:
- Backend queries Kusto directly
- 5-minute TTL cache prevents repeated queries
- Falls back to CSV if Kusto unavailable

### Cached Data (Pre-aggregated)
Used for:
- Dashboard summaries
- Charts and visualizations
- Data exports

How:
- Nightly sync via `sync-all-data.py`
- Frontend reads from `/data/aggregated/*.json`
- Much faster load times

## Running Syncs

### Manual Sync
```bash
# Full sync (Kusto + GitHub API)
python scripts/sync-all-data.py

# Kusto only
python scripts/sync-all-data.py --kusto-only

# GitHub API only
python scripts/sync-all-data.py --github-only
```

### Automated Sync (Recommended)
Set up a cron job or GitHub Action:
```bash
# Nightly at 2am
0 2 * * * cd /path/to/project && python scripts/sync-all-data.py >> /var/log/data-sync.log 2>&1
```

### Environment Variables
```bash
# Required for GitHub API
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
export GITHUB_ORG="your-org-name"

# Optional for Kusto (uses DefaultAzureCredential)
export AZURE_TENANT_ID="..."
export AZURE_CLIENT_ID="..."
export AZURE_CLIENT_SECRET="..."
```

## Monitoring

### Check Sync Status
```bash
# View sync status
cat data/sync_status.json

# API endpoint
curl http://localhost:8000/api/metrics/sync-status
```

### File Health Check
```bash
# Check row counts
for f in data/*.csv; do echo "$f: $(wc -l < $f) rows"; done
```

## Performance Considerations

### Kusto Queries
- Use `| take N` to limit results
- Leverage query caching (5-minute TTL)
- Cross-cluster queries can be slow

### GitHub API
- Rate limit: 5,000/hour authenticated
- Use conditional requests (If-Modified-Since)
- Batch operations where possible

### Frontend
- Pre-aggregate data in `scripts/aggregate-data.ts`
- Use React Query for client-side caching
- Paginate large result sets
