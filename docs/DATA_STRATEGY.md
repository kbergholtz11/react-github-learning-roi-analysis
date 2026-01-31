# Data Strategy

> **📚 Reference**: This strategy aligns with [GitHub's Data Onboarding Guide](https://github.com/github/data/blob/master/docs/learn-data.md) and uses curated canonical tables where possible.
>
> **🔍 Explore Tables**: [Data Dot](https://data.githubapp.com/) (set profile to 'advanced')
> 
> **❓ Need Help?**: [Open a Data Request](https://github.com/github/data/issues/new?assignees=&labels=Data+Request%2C+Needs+Triage&template=data-request-.md) or ask in [#data](https://github.slack.com/archives/C01BMJPHV98)
>
> **Related Docs**: [DATA_PRINCIPLES.md](./DATA_PRINCIPLES.md) | [METRICS.yaml](./METRICS.yaml) | [DATA_SYNC.md](./DATA_SYNC.md)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATA FLOW ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                     CANONICAL DATA LAYER                            │     │
│  │  (Curated, high-quality tables from github/data team)               │     │
│  │                                                                     │     │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │     │
│  │  │  KUSTO CLUSTERS      │  │  TRINO/HIVE          │                 │     │
│  │  │  (~90 days hot)      │  │  (7+ months)         │                 │     │
│  │  │                      │  │                      │                 │     │
│  │  │  • gh-analytics      │  │  • hive_hydro.*      │                 │     │
│  │  │    - canonical.*     │  │  • canonical.*       │                 │     │
│  │  │    - hydro.*         │  │  • snapshots.*       │                 │     │
│  │  │    - snapshots       │  │                      │                 │     │
│  │  │                      │  │  (Requires Prod VPN) │                 │     │
│  │  │  • cse-analytics     │  │                      │                 │     │
│  │  │    - ACE db          │  │                      │                 │     │
│  │  └──────────┬───────────┘  └───────────┬──────────┘                 │     │
│  └─────────────│──────────────────────────│────────────────────────────┘     │
│                │                          │                                  │
│                ▼                          ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    SYNC LAYER                                        │     │
│  │  scripts/sync-enriched-learners.py    scripts/sync-trino-skills.py  │     │
│  │  • Uses canonical.* tables            • Historical data (7+ months)  │     │
│  │  • Joins on dotcom_id/global_id       • Octopy library for Trino     │     │
│  │  • Caching with TTL per query type    • Requires Production VPN      │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │              DATA FILES (data/)                                      │     │
│  │  • learners_enriched.parquet (main dataset)                          │     │
│  │  • aggregated/*.json (pre-computed for dashboards)                   │     │
│  │  • *.csv (fallback/debug)                                            │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │           FastAPI Backend (DuckDB + CSV fallback)                    │     │
│  │  • Primary: Query learners_enriched.parquet via DuckDB               │     │
│  │  • Fallback: Aggregated JSON files                                   │     │
│  │  • Live: Query Kusto for real-time data                              │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │           Next.js Frontend (React Query caching)                     │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Sources & Tables

Following GitHub's data architecture, we use three types of tables:

### 1. Canonical Tables (Curated, High-Quality)

> 📖 [Canonical tables documentation](https://data.githubapp.com/search?query=canonical) - curated by Enterprise & Core Metrics team

| Table | Purpose | Used In | Data Dot Link |
|-------|---------|---------|---------------|
| `canonical.accounts_all` | User/Org/Business demographics | Query 4 (demographics) | [View](https://data.githubapp.com/warehouse/hive/canonical/accounts_all) |
| `canonical.relationships_all` | User↔Org relationships | Query 5 (org enrichment) | [View](https://data.githubapp.com/warehouse/hive/canonical/relationships_all) |
| `canonical.account_hierarchy_global_all` | Company/customer attribution | Query 5 (company names) | [View](https://data.githubapp.com/warehouse/hive/canonical/account_hierarchy_global_all) |
| `canonical.user_daily_activity_per_product` | Product usage by user | Query 7 (Copilot/Actions) | [View](https://data.githubapp.com/warehouse/hive/canonical/user_daily_activity_per_product) |
| `canonical.account_hierarchy_dotcom_all` | Direct user→company | Query 5B (individual users) | [View](https://data.githubapp.com/warehouse/hive/canonical/account_hierarchy_dotcom_all) |

**Important**: For `*_all` tables, always filter by `day` partition: `| summarize arg_max(day, *) by dotcom_id`

### 2. Hydro Tables (Event Streams)

> 📖 [Hydro documentation](https://docs.google.com/document/d/1cc4_5lG1rGlvjGYqMXyPUuEShPX4THSZTl0glqp6iCc/edit) - Schema definitions in [github/hydro-schemas](https://github.com/github/hydro-schemas)

| Table | Purpose | Retention | Used In |
|-------|---------|-----------|---------|
| `hydro.analytics_v0_page_view` | Skills/Learn page views | ~90 days (Kusto) / 7+ months (Trino) | Query 2, 2B, 2C |
| `hydro.github_v1_user_signup` | Email→dotcom_id mapping | Variable | Query 1 (email mapping) |

**Retention Note**: Hydro tables in Kusto have limited retention (~90 days). For historical data, use Trino via [Octopy](https://github.com/github/octopy) (requires Production VPN).

### 3. Snapshot Tables (Production DB Copies)

> 📖 Snapshots are direct copies from production DBs. See [Snapshot docs](https://github.com/github/data-engineering/blob/master/docs/Snapshots.md)

| Table | Purpose | Used In |
|-------|---------|---------|
| `snapshots.github_mysql1_user_emails_current` | Verified email→user mapping | Query 1 (authoritative email lookup) |

### 4. ACE-Specific Tables (Exam/Certification Data)

| Cluster | Table | Purpose |
|---------|-------|---------|
| `gh-analytics.eastus` | `ace.exam_results` | FY22-25 exam results |
| `gh-analytics.eastus` | `ace.users` | ACE portal registrations |
| `gh-analytics.eastus` | `ace.event_registrants` | Event registrations |
| `cse-analytics.centralus` | `ACE.pearson_exam_results` | FY26 Pearson exam results |
| `cse-analytics.centralus` | `ACE.partner_credentials` | Partner-issued certifications |

## Data Retention & Access

| Data Source | Retention | Access Method | VPN Required |
|-------------|-----------|---------------|--------------|
| **Kusto (gh-analytics)** | ~90 days (hot cache) | Azure DefaultCredential | No |
| **Kusto (cse-analytics)** | Variable | Azure DefaultCredential | No |
| **Trino/Hive** | 7+ months | Octopy library | **Yes** (Production VPN) |
| **Data Dot** | Variable | Web UI | No (okta-network-gateway entitlement) |

### Getting Production VPN Access

For historical data (>90 days), you need Production VPN:
1. Visit [Production VPN Access](https://thehub.github.com/security/security-operations/production-vpn-access/)
2. Configure Viscosity with Production profile
3. Run `python scripts/sync-trino-skills.py` for historical Skills/Learn data

## Primary: Kusto Clusters

| Cluster | Database | Purpose | Data Dot |
|---------|----------|---------|----------|
| `cse-analytics.centralus.kusto.windows.net` | ACE | FY26 Pearson exam results, partner credentials | N/A (ACE-specific) |
| `gh-analytics.eastus.kusto.windows.net` | ace | FY22-25 exam results, ACE registrations | N/A (ACE-specific) |
| `gh-analytics.eastus.kusto.windows.net` | canonical | Curated account/user tables | [View](https://data.githubapp.com/search?query=canonical) |
| `gh-analytics.eastus.kusto.windows.net` | hydro | Event streams (page views) | [View](https://data.githubapp.com/search?query=hydro) |
| `gh-analytics.eastus.kusto.windows.net` | snapshots | Production DB snapshots | [View](https://data.githubapp.com/search?query=snapshots) |

## Secondary: GitHub API

| Endpoint | Data | Rate Limit |
|----------|------|------------|
| `/orgs/{org}/copilot/metrics` | Copilot usage stats | 60/hour |
| `/users/{username}/events` | User activity | 60/hour (unauthenticated) |
| `/repos/skills/{repo}/forks` | Skills course enrollments | 60/hour |

## Cached Data Files

| File | Source Table | Refresh | Purpose |
|------|--------------|---------|---------|
| `learners_enriched.parquet` | All canonical + ACE | Nightly | **Primary dataset** - all learners with full enrichment |
| `certified_users.csv` | `ace.exam_results` | Nightly | Certified users only |
| `unified_users.csv` | `ace.users` | Nightly | ACE registrants |
| `individual_exams.csv` | `ace.exam_results` | Nightly | Individual exam records |
| `product_usage.csv` | `canonical.user_daily_activity_per_product` | Nightly | Product usage metrics |
| `copilot_daily.csv` | GitHub Copilot API | Nightly | Org-level Copilot metrics |
| `learning_activity.csv` | `hydro.analytics_v0_page_view` | Nightly | Skills/Learn page views |
| `aggregated/*.json` | Derived from above | Nightly | Pre-computed dashboard data |

## Company Attribution Strategy

Following GitHub's data hierarchy for company attribution (most to least authoritative):

| Priority | Source | Field | Description |
|----------|--------|-------|-------------|
| 1 | `account_hierarchy_global_all` | `customer_name` | Billing customer (1:1 with Zuora) |
| 2 | `account_hierarchy_global_all` | `salesforce_account_name` | CRM account name |
| 3 | `account_hierarchy_global_all` | `salesforce_parent_account_name` | CRM parent account |
| 4 | `partner_credentials` | `Partner Name` | Partner that issued credential |
| 5 | `ace.users` | `company` | Self-reported on registration |
| 6 | `relationships_all` | org `login` | GitHub organization name |

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
## Data Quality Considerations

### Skills → Product Adoption Correlation Caveats

When analyzing the correlation between Skills course completion and product adoption, be aware of these data quality considerations:

| Product | Independent of Skills? | Notes |
|---------|----------------------|-------|
| **Copilot** | ✅ **Yes** | Copilot is not used within Skills courses. The correlation is genuine organic adoption. |
| **Actions** | ⚠️ **Partially** | Many Skills courses use Actions workflows as teaching tools. Some Actions usage is course-triggered. |
| **Security** | ⚠️ **Partially** | Security Skills courses may trigger Dependabot/CodeQL scans on forked repos. |
| **Pull Requests** | ✅ **Yes** | PR usage outside Skills repos is tracked independently. |

### How Skills Courses Work

1. User forks a template repo from `skills/*` (e.g., `skills/introduction-to-github`)
2. The fork lives in user's space (e.g., `username/introduction-to-github`)
3. Actions workflows in the fork run as the user completes exercises
4. These Actions runs ARE counted in `user_daily_activity_per_product`

### Why Copilot Correlation is Valid

- GitHub Skills courses do **not** require or prompt Copilot usage
- Copilot is a separate IDE plugin, not triggered by Skills repos
- The observed +46% Copilot adoption for 5+ Skills users reflects genuine organic adoption

### Future Improvement: Filter Course Activity

To isolate "organic" product usage from course activity, we could:

1. **Filter by repository**: Exclude activity on repos named `skills/*` patterns
2. **Post-training window**: Look at product usage 30-60 days AFTER course completion
3. **Minimum threshold**: Require 5+ Actions days (vs. 1-2 from course exercises)

This would require modifying Query 7 in `sync-enriched-learners.py` to join with `repositories_current` and filter by `nwo NOT LIKE 'skills/%'`.