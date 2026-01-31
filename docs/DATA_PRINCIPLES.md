# Data Principles

> **📚 Based on**: [GitHub Data Principles](https://github.com/github/data/blob/master/principles.md)
> 
> These principles guide how we work with data in the Learning ROI application.

## Core Principles

### 1. 🎯 In Canonical We Trust

**Always prefer curated canonical tables over raw event data.**

Canonical tables (`canonical.*`) are maintained by GitHub's Enterprise & Core Metrics team. They are:
- Curated and validated
- Well-documented in [Data Dot](https://data.githubapp.com/)
- The single source of truth for dimensions like users, orgs, and companies

**Do This:**
```kql
// Use canonical for user data
canonical_accounts_current
| where dotcom_id == 12345
| project dotcom_id, login, email, country_account
```

**Not This:**
```kql
// Don't query raw tables when canonical exists
snapshots_github_mysql1_users_current
| where id == 12345
```

**Our Canonical Tables:**
- `canonical.accounts_all/current` - User demographics
- `canonical.relationships_all` - User↔Org membership
- `canonical.account_hierarchy_global_all` - Company attribution
- `canonical.user_daily_activity_per_product` - Product usage

---

### 2. 🔍 Self-Serve is Best

**Enable exploration, don't just build dashboards.**

Every visualization should link back to the underlying query so users can:
- Drill into the data themselves
- Ask follow-up questions
- Extend analyses without waiting

**Implementation:**
```typescript
// Every chart includes "Explore in Kusto" link
<ExploreInKusto query={chartQuery} />
```

---

### 3. 📏 Define a Metric Just Once

**Single source of truth for all metrics.**

Every metric should be:
1. Defined once in `docs/METRICS.yaml`
2. Calculated consistently across all views
3. Documented with its source and formula

**Example:**
```yaml
certified_user:
  definition: User with at least one passed GitHub certification exam
  source: ACE.exam_results
  formula: COUNT(DISTINCT dotcom_id) WHERE passed = true
  data_dot: https://data.githubapp.com/warehouse/kusto/ACE/exam_results
```

---

### 4. 🏗️ Design for Quality and Consistency

**Data quality is everyone's responsibility.**

Before using any data source:
1. Check [Data Dot](https://data.githubapp.com/) for documentation
2. Understand the SLA/freshness guarantees
3. Know the data lineage (where it comes from)

**Our Quality Checks:**
- `scripts/validate-data-quality.py` - Runs after every sync
- Automated alerts when quality degrades
- Fill rate monitoring for key fields

---

### 5. 📊 Invest in Data Models, Not Dashboards

**Build reusable data models, not one-off reports.**

Our data architecture:
```
Canonical Tables → Sync Layer → Data Files → API → Frontend
```

Each layer adds value:
- **Sync Layer**: Joins, enrichment, caching
- **Data Files**: Fast local queries via DuckDB
- **API**: Standardized access patterns
- **Frontend**: Multiple visualizations from same data

---

### 6. 🔗 Always Link to Source

**Every data point should be traceable to its source.**

Include in every query and script:
```python
"""
Data Source: canonical.accounts_all
Data Dot: https://data.githubapp.com/warehouse/hive/canonical/accounts_all
SLO: Ready by 09:00 UTC daily (10h from midnight)
Last Updated: Query sync_status.json for freshness
"""
```

---

## Data Hierarchy

When attributing data (e.g., company names), follow this priority:

1. **`customer_name`** - Zuora billing customer (most authoritative, 1:1 with billing)
2. **`salesforce_account_name`** - CRM account name
3. **`salesforce_parent_account_name`** - CRM parent account
4. **`partner_companies`** - Partner credential companies
5. **`org_name`** - GitHub organization (fallback)

---

## SLOs and Freshness

| Data Type | SLO | Optimal Sync Time |
|-----------|-----|-------------------|
| Canonical tables | 10h from midnight UTC | 10:00-11:00 UTC |
| Account hierarchy | 14h from midnight UTC | 14:00-15:00 UTC |
| Hydro to Kusto | 99% within 20 minutes | Near real-time |
| DB Snapshots | Ready by 09:00 UTC | 09:00-10:00 UTC |

---

## Retention Awareness

| Storage | Retention | Use Case |
|---------|-----------|----------|
| Kusto (gh-analytics) | ~90 days hot cache | Recent data, dashboards |
| Trino/Hive | 7+ months | Historical analysis |
| ACE tables | Full history | Certification records |

**Important:** Skills/Learn page views in Kusto only go back ~90 days. For historical data, use `scripts/sync-trino-skills.py` (requires Production VPN).

---

## Getting Help

- **Data Questions**: [#data](https://github.slack.com/archives/C01BMJPHV98)
- **Data Requests**: [Open an issue](https://github.com/github/data/issues/new?assignees=&labels=Data+Request)
- **Office Hours**: Wednesdays 17:30 UTC ([zoom link](https://github.zoom.us/j/644693579))
- **Data Dot**: https://data.githubapp.com/

---

## Related Documentation

- [DATA_STRATEGY.md](./DATA_STRATEGY.md) - Architecture and table mappings
- [DATA_SYNC.md](./DATA_SYNC.md) - Sync scripts and schedules
- [METRICS.yaml](./METRICS.yaml) - Metric definitions
- [github/data README](https://github.com/github/data) - Central data team docs
