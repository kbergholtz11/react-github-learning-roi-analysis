# Data Sync Guide

This document explains how to sync data from Kusto clusters for the Learning ROI Dashboard.

> **📚 Data Architecture Reference**: See [learn-data.md](https://github.com/github/data/blob/master/docs/learn-data.md) for GitHub's data documentation patterns.
>
> **🔍 Explore Tables**: [Data Dot](https://data.githubapp.com/) (set profile to 'advanced' for all tables)

## Overview

The dashboard uses data from GitHub's data warehouse following the [canonical data patterns](https://data.githubapp.com/search?query=canonical):

| Data Layer | Source | Retention | VPN Required |
|------------|--------|-----------|--------------|
| **Canonical Tables** | `canonical.*` on gh-analytics | 2+ years | No |
| **Hydro Events** | `hydro.*` on gh-analytics | ~90 days | No |
| **Trino/Hive** | `hive_hydro.*` | 7+ months | **Yes** (Production) |
| **ACE Specific** | `ace.*` on both clusters | Full history | No |

### Kusto Clusters

| Cluster | URL | Databases | Data |
|---------|-----|-----------|------|
| **CSE Analytics** | cse-analytics.centralus.kusto.windows.net | ACE | FY26 Pearson exam data, partner credentials |
| **GH Analytics** | gh-analytics.eastus.kusto.windows.net | ace, canonical, hydro, snapshots | FY22-25 exam data, product usage, learning activity |

### Table Types (from learn-data.md)

| Type | Pattern | Description | Example |
|------|---------|-------------|---------|
| **Canonical** | `canonical.*_all/current` | Curated, high-quality | `accounts_all`, `relationships_all` |
| **Hydro** | `hydro.*` | Event streams | `analytics_v0_page_view` |
| **Snapshots** | `snapshots.*_current` | Production DB copies | `github_mysql1_user_emails_current` |

## Quick Start

```bash
# One-time sync
./scripts/auto-sync.sh

# Kusto only (no GitHub API)
./scripts/auto-sync.sh kusto

# Check status
cat data/sync_status.json
```

## Data Files

After sync, the following files are populated in the `data/` directory:

| File | Rows | Description |
|------|------|-------------|
| `certified_users.csv` | ~84K | All learners with certification status, dotcom_id |
| `unified_users.csv` | ~84K | Same as certified_users (complete learner view) |
| `individual_exams.csv` | ~120K | All exam attempts with dates, status, scores |
| `product_usage.csv` | ~33K | Copilot, Actions, Security usage per user |
| `learning_activity.csv` | ~340 | GitHub Learn, Skills, Docs engagement |

## Data Sources & Queries

### Certified Users (FY22-25 + FY26)

Uses 3-source email→dotcom_id mapping:
1. `snapshots.github_mysql1_user_emails_current` (authoritative, verified emails)
2. `hydro.github_v1_user_signup` (signup data with actor.id)
3. `ace.exam_results` (exam data with dotcomid)

Unions exam data from:
- `gh-analytics.ace.exam_results` (FY22-25)
- `cse-analytics.ACE.pearson_exam_results` (FY26)

### Individual Exams

Combines:
- **FY22-25**: `exam_results` table with calculated scores from correct/incorrect
- **FY26**: `pearson_exam_results` with direct Score field

### Product Usage

From `gh-analytics.canonical.user_daily_activity_per_product`:
- Copilot events and days
- Actions events
- Security events
- Total engagement metrics

### Learning Activity

From `gh-analytics.hydro.analytics_v0_page_view`:
- learn.microsoft.com views
- skills.github.com views
- docs.github.com views

## Automation

### Cron Job (Recommended)

Add to crontab (`crontab -e`):

```cron
# Sync every 6 hours
0 */6 * * * cd /path/to/react-github-learning-roi-analysis && ./scripts/auto-sync.sh >> logs/sync.log 2>&1

# Or daily at 2 AM
0 2 * * * cd /path/to/react-github-learning-roi-analysis && ./scripts/auto-sync.sh >> logs/sync.log 2>&1
```

### GitHub Actions (Alternative)

Create `.github/workflows/sync-data.yml`:

```yaml
name: Sync Data
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install azure-kusto-data azure-identity
      
      - name: Run sync
        run: python scripts/sync-all-data.py --kusto-only
      
      - name: Commit changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add data/
          git commit -m "chore: sync data" || echo "No changes"
          git push
```

## Troubleshooting

### Authentication Errors

Ensure you're authenticated to Azure:

```bash
az login
az account show
```

### Permission Errors

You need read access to both clusters. Contact your Azure admin if you see 403 errors.

Common entitlements needed:
- `azure-datawarehouse-viewer` for gh-analytics canonical tables
- ACE-specific access for cse-analytics

### Query Timeouts

Large queries may timeout. The script uses 5-minute timeouts for complex cross-cluster queries.

### Hydro Data Retention (~90 days)

If Skills/Learn data is missing for older users:

1. **Problem**: Kusto hydro tables only keep ~90 days of hot cache data
2. **Solution**: Run the Trino sync for historical data:

```bash
# 1. Connect to Production VPN (Viscosity)
# 2. Run Trino sync
python scripts/sync-trino-skills.py
# 3. Re-run main sync (will merge historical data)
python scripts/sync-enriched-learners.py
```

See [data-warehouse-retention.md](https://github.com/github/data/blob/master/docs/data-warehouse-retention.md) for details.

### Finding Column Meanings

If a column isn't documented in Data Dot:
1. Check the [hydro-schemas repo](https://github.com/github/hydro-schemas) for .proto definitions
2. Look at the Lineage tab in Data Dot to see source transformations
3. Ask in [#data](https://github.slack.com/archives/C01BMJPHV98) Slack channel

## Getting Help

- **Data Dot**: https://data.githubapp.com/ (browse table schemas)
- **Slack**: #data, #data-engineering
- **Data Request**: [Open a request](https://github.com/github/data/issues/new?labels=Data+Request)
- **Past requests**: [Search existing issues](https://github.com/github/data/issues?q=label%3A%22Data+Request%22)

## Manual Testing

Run the sync script with debug output:

```bash
cd /path/to/react-github-learning-roi-analysis
source backend/.venv/bin/activate
python scripts/sync-all-data.py --kusto-only
```

Check the sync status:

```bash
cat data/sync_status.json | python -m json.tool
```

## Data Quality Checks

After sync, verify:

1. **Row counts**: Should be ~84K certified users, ~120K exams
2. **Identity resolution**: ~69% of users should have dotcom_id > 0
3. **Score coverage**: FY22-25 exams have calculated scores from correct/incorrect
