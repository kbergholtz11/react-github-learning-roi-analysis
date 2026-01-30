# Data Sync Guide

This document explains how to sync data from Kusto clusters for the Learning ROI Dashboard.

## Overview

The dashboard uses data from two Azure Data Explorer (Kusto) clusters:

| Cluster | URL | Databases | Data |
|---------|-----|-----------|------|
| **CSE Analytics** | cse-analytics.centralus.kusto.windows.net | ACE | FY26 Pearson exam data |
| **GH Analytics** | gh-analytics.eastus.kusto.windows.net | ace, copilot, hydro, snapshots | FY22-25 exam data, product usage, learning activity |

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

### Query Timeouts

Large queries may timeout. The script uses 5-minute timeouts for complex cross-cluster queries.

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
