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
