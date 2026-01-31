#!/usr/bin/env python3
"""
Test script for pre-certification product usage query.
Tries different optimization strategies to find one that works.
"""

import os
import sys
import pandas as pd
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
from azure.kusto.data.helpers import dataframe_from_result_table
from azure.identity import DefaultAzureCredential

# Kusto cluster URIs
GH_ANALYTICS_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"

def get_kusto_client(cluster_uri: str) -> KustoClient:
    """Create authenticated Kusto client."""
    credential = DefaultAzureCredential()
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(cluster_uri, credential)
    return KustoClient(kcsb)

def run_query(client: KustoClient, database: str, query: str, name: str) -> pd.DataFrame:
    """Execute query with extended timeout."""
    print(f"\n{'='*60}")
    print(f"Running: {name}")
    print(f"{'='*60}")
    start = datetime.now()
    
    try:
        # Set extended timeout (10 minutes)
        from azure.kusto.data import ClientRequestProperties
        from datetime import timedelta
        props = ClientRequestProperties()
        props.set_option(ClientRequestProperties.results_defer_partial_query_failures_option_name, True)
        props.set_option("servertimeout", timedelta(minutes=10))
        
        response = client.execute_query(database, query, props)
        df = dataframe_from_result_table(response.primary_results[0])
        elapsed = (datetime.now() - start).total_seconds()
        print(f"✅ Success: {len(df)} rows in {elapsed:.1f}s")
        return df
    except Exception as e:
        elapsed = (datetime.now() - start).total_seconds()
        print(f"❌ Failed after {elapsed:.1f}s: {str(e)[:200]}")
        return pd.DataFrame()

# Strategy 1: Use join with broadcast hint (small table broadcast to all nodes)
QUERY_BROADCAST = """
let certified_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id;

user_daily_activity_per_product
| where user_id > 0
| join kind=inner hint.strategy=broadcast certified_users on $left.user_id == $right.dotcom_id
| where day < first_exam and day >= datetime_add('day', -90, first_exam)
| summarize
    copilot_days = dcountif(day, product has "Copilot"),
    actions_days = dcountif(day, product == "Actions"),
    security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    total_days = dcount(day)
by user_id
| project dotcom_id=user_id, copilot_days, actions_days, security_days, total_days,
          used_copilot = copilot_days > 0, used_actions = actions_days > 0
"""

# Strategy 2: Materialize exam dates, use shuffle join
QUERY_SHUFFLE = """
let certified_users = materialize(
    cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id
);

user_daily_activity_per_product
| where user_id > 0
| join kind=inner hint.shufflekey=user_id certified_users on $left.user_id == $right.dotcom_id
| where day < first_exam and day >= datetime_add('day', -90, first_exam)
| summarize
    copilot_days = dcountif(day, product has "Copilot"),
    actions_days = dcountif(day, product == "Actions"),
    total_days = dcount(day)
by user_id
| project dotcom_id=user_id, copilot_days, actions_days, total_days,
          used_copilot = copilot_days > 0, used_actions = actions_days > 0
"""

# Strategy 3: Limit to recent certifications only (last 1 year)
QUERY_RECENT_ONLY = """
let certified_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id
    | where first_exam >= ago(365d);  // Only last year

user_daily_activity_per_product
| where day >= ago(365d + 90d)
| where user_id > 0
| join kind=inner hint.shufflekey=user_id certified_users on $left.user_id == $right.dotcom_id
| where day < first_exam and day >= datetime_add('day', -90, first_exam)
| summarize
    copilot_days = dcountif(day, product has "Copilot"),
    actions_days = dcountif(day, product == "Actions"),
    security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    total_days = dcount(day)
by user_id
| project dotcom_id=user_id, copilot_days, actions_days, security_days, total_days,
          used_copilot = copilot_days > 0, used_actions = actions_days > 0
"""

# Strategy 4: Filter product data first using semi-join
QUERY_SEMIJOIN = """
// Get certified user IDs first
let cert_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | distinct dotcom_id;

// Get exam dates separately
let exam_dates = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id;

// Filter product data to only certified users, then join exam dates
user_daily_activity_per_product
| where user_id in (cert_ids)
| join kind=inner exam_dates on $left.user_id == $right.dotcom_id
| where day < first_exam and day >= datetime_add('day', -90, first_exam)
| summarize
    copilot_days = dcountif(day, product has "Copilot"),
    actions_days = dcountif(day, product == "Actions"),
    total_days = dcount(day)
by user_id
| project dotcom_id=user_id, copilot_days, actions_days, total_days,
          used_copilot = copilot_days > 0, used_actions = actions_days > 0
"""

# Strategy 5: Run in batches by year (2024 only)
QUERY_BY_YEAR_2024 = """
let certified_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id
    | where first_exam >= datetime(2024-01-01) and first_exam < datetime(2025-01-01);

user_daily_activity_per_product
| where day >= datetime(2023-10-01) and day < datetime(2025-01-01)
| where user_id > 0
| join kind=inner hint.shufflekey=user_id certified_users on $left.user_id == $right.dotcom_id
| where day < first_exam and day >= datetime_add('day', -90, first_exam)
| summarize
    copilot_days = dcountif(day, product has "Copilot"),
    actions_days = dcountif(day, product == "Actions"),
    security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
    total_days = dcount(day)
by user_id
| project dotcom_id=user_id, copilot_days, actions_days, security_days, total_days,
          used_copilot = copilot_days > 0, used_actions = actions_days > 0
"""

def main():
    print("🚀 Testing Pre-Certification Query Optimization Strategies")
    print("="*60)
    
    # Get client
    client = get_kusto_client(GH_ANALYTICS_CLUSTER)
    
    strategies = [
        ("Strategy 1: Broadcast Join", QUERY_BROADCAST),
        ("Strategy 2: Shuffle Join", QUERY_SHUFFLE),
        ("Strategy 3: Recent Only (1 year)", QUERY_RECENT_ONLY),
        ("Strategy 4: Semi-join filter", QUERY_SEMIJOIN),
        ("Strategy 5: By Year (2024)", QUERY_BY_YEAR_2024),
    ]
    
    results = {}
    for name, query in strategies:
        df = run_query(client, "canonical", query, name)
        if not df.empty:
            results[name] = df
            print(f"  Sample: {df.head(3).to_dict()}")
            
            # If we got good results, show summary
            if 'used_copilot' in df.columns:
                copilot_rate = df['used_copilot'].sum() / len(df) * 100
                print(f"  📊 Copilot pre-cert rate: {copilot_rate:.1f}%")
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    for name, df in results.items():
        print(f"✅ {name}: {len(df)} rows")
    
    if not results:
        print("❌ All strategies failed. The data may require different approach.")
    else:
        best = max(results.items(), key=lambda x: len(x[1]))
        print(f"\n🏆 Best result: {best[0]} with {len(best[1])} rows")

if __name__ == "__main__":
    main()
