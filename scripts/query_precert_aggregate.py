#!/usr/bin/env python3
"""
Query pre-certification statistics directly from Kusto.
Returns aggregate stats, not individual user data.
"""

import os
import sys
import pandas as pd
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder, ClientRequestProperties
from azure.kusto.data.helpers import dataframe_from_result_table
from azure.identity import DefaultAzureCredential

GH_ANALYTICS_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"

def get_kusto_client(cluster_uri: str) -> KustoClient:
    credential = DefaultAzureCredential()
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(cluster_uri, credential)
    return KustoClient(kcsb)

def run_query(client: KustoClient, database: str, query: str, timeout_min: int = 10) -> pd.DataFrame:
    props = ClientRequestProperties()
    props.set_option("servertimeout", timedelta(minutes=timeout_min))
    response = client.execute_query(database, query, props)
    return dataframe_from_result_table(response.primary_results[0])

def main():
    print("🚀 Pre-Certification Statistics Query")
    print("="*60)
    print("Querying AGGREGATE pre-cert stats (no individual user data)")
    print("="*60)
    
    client = get_kusto_client(GH_ANALYTICS_CLUSTER)
    
    # Query that returns aggregate statistics only
    # This should be much faster as it doesn't return millions of rows
    query = """
    // Pre-certification aggregate statistics
    // Get exam dates for all certified users
    let certified_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
        | where passed == true and isnotempty(dotcomid)
        | extend dotcom_id = tolong(dotcomid)
        | where dotcom_id > 0
        | summarize first_exam = min(endtime) by dotcom_id
        | where first_exam >= ago(365d * 2);  // Last 2 years only

    let total_certified = toscalar(certified_users | count);

    // Get pre-cert activity and aggregate by user first, then count
    user_daily_activity_per_product
    | where day >= ago(365d * 2 + 90d)
    | where user_id > 0
    | join kind=inner certified_users on $left.user_id == $right.dotcom_id
    | where day < first_exam and day >= datetime_add('day', -90, first_exam)
    | summarize 
        used_copilot = countif(product has "Copilot") > 0,
        used_actions = countif(product == "Actions") > 0,
        used_security = countif(product has_any ("Security", "Dependabot", "CodeQL")) > 0,
        used_pr = countif(product == "Pull Requests") > 0,
        used_issues = countif(product == "Issues") > 0
    by user_id
    | summarize 
        users_any_activity = count(),
        users_copilot = countif(used_copilot),
        users_actions = countif(used_actions),
        users_security = countif(used_security),
        users_pr = countif(used_pr),
        users_issues = countif(used_issues)
    | extend total_certified = total_certified
    | project 
        total_certified,
        users_any_activity,
        users_copilot,
        users_actions,
        users_security,
        users_pr,
        users_issues,
        pct_any = round(todouble(users_any_activity) / total_certified * 100, 1),
        pct_copilot = round(todouble(users_copilot) / total_certified * 100, 1),
        pct_actions = round(todouble(users_actions) / total_certified * 100, 1),
        pct_security = round(todouble(users_security) / total_certified * 100, 1),
        pct_pr = round(todouble(users_pr) / total_certified * 100, 1),
        pct_issues = round(todouble(users_issues) / total_certified * 100, 1)
    """
    
    print("\n📊 Running aggregate query...")
    start = datetime.now()
    
    try:
        df = run_query(client, "canonical", query, timeout_min=10)
        elapsed = (datetime.now() - start).total_seconds()
        
        if df.empty:
            print("❌ No results")
            return
            
        print(f"✅ Query completed in {elapsed:.1f}s")
        
        row = df.iloc[0]
        
        print("\n" + "="*60)
        print("PRE-CERTIFICATION PRODUCT USAGE")
        print("(90 days before certification, last 2 years)")
        print("="*60)
        
        print(f"\nTotal certified users: {int(row['total_certified']):,}")
        print(f"Users with any pre-cert activity: {int(row['users_any_activity']):,} ({row['pct_any']}%)")
        
        print(f"\nProduct usage in 90 days BEFORE certification:")
        print(f"  Copilot:  {int(row['users_copilot']):,} ({row['pct_copilot']}%)")
        print(f"  Actions:  {int(row['users_actions']):,} ({row['pct_actions']}%)")
        print(f"  Security: {int(row['users_security']):,} ({row['pct_security']}%)")
        print(f"  PRs:      {int(row['users_pr']):,} ({row['pct_pr']}%)")
        print(f"  Issues:   {int(row['users_issues']):,} ({row['pct_issues']}%)")
        
    except Exception as e:
        elapsed = (datetime.now() - start).total_seconds()
        print(f"❌ Failed after {elapsed:.1f}s: {e}")

if __name__ == "__main__":
    main()
