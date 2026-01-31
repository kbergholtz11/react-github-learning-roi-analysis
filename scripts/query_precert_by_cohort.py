#!/usr/bin/env python3
"""
Query pre-certification product usage by processing certification cohorts.
Breaks the massive query into monthly chunks that can complete within timeout.
"""

import os
import sys
import pandas as pd
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder, ClientRequestProperties
from azure.kusto.data.helpers import dataframe_from_result_table
from azure.identity import DefaultAzureCredential

GH_ANALYTICS_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"

def get_kusto_client(cluster_uri: str) -> KustoClient:
    credential = DefaultAzureCredential()
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(cluster_uri, credential)
    return KustoClient(kcsb)

def run_query(client: KustoClient, database: str, query: str, timeout_min: int = 8) -> pd.DataFrame:
    props = ClientRequestProperties()
    props.set_option("servertimeout", timedelta(minutes=timeout_min))
    response = client.execute_query(database, query, props)
    return dataframe_from_result_table(response.primary_results[0])

def query_precert_for_month(client: KustoClient, year: int, month: int) -> pd.DataFrame:
    """Query pre-cert usage for users certified in a specific month."""
    
    # Calculate date range for this cohort
    start_date = datetime(year, month, 1)
    end_date = start_date + relativedelta(months=1)
    precert_start = start_date - timedelta(days=90)
    
    query = f"""
    // Pre-certification usage for users certified in {year}-{month:02d}
    // Get users who passed exams in this month
    let certified_this_month = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
        | where passed == true 
        | where isnotempty(dotcomid)
        | extend dotcom_id = tolong(dotcomid)
        | where dotcom_id > 0
        | summarize first_exam = min(endtime) by dotcom_id
        | where first_exam >= datetime({start_date.strftime('%Y-%m-%d')}) 
        | where first_exam < datetime({end_date.strftime('%Y-%m-%d')});

    // Get their product usage in 90 days BEFORE their certification
    user_daily_activity_per_product
    | where day >= datetime({precert_start.strftime('%Y-%m-%d')})
    | where day < datetime({end_date.strftime('%Y-%m-%d')})
    | where user_id > 0
    | join kind=inner certified_this_month on $left.user_id == $right.dotcom_id
    | where day < first_exam and day >= datetime_add('day', -90, first_exam)
    | summarize
        copilot_days = dcountif(day, product has "Copilot"),
        actions_days = dcountif(day, product == "Actions"),
        security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
        pr_days = dcountif(day, product == "Pull Requests"),
        issues_days = dcountif(day, product == "Issues"),
        code_search_days = dcountif(day, product == "Code Search"),
        total_active_days = dcount(day)
    by user_id
    | project
        dotcom_id = user_id,
        used_copilot_precert = copilot_days > 0,
        used_actions_precert = actions_days > 0,
        used_security_precert = security_days > 0,
        used_pr_precert = pr_days > 0,
        used_issues_precert = issues_days > 0,
        used_code_search_precert = code_search_days > 0,
        copilot_days_precert = copilot_days,
        actions_days_precert = actions_days,
        security_days_precert = security_days,
        total_active_days_precert = total_active_days
    """
    
    try:
        df = run_query(client, "canonical", query, timeout_min=5)
        df['cert_year'] = year
        df['cert_month'] = month
        return df
    except Exception as e:
        print(f"      ❌ Failed: {str(e)[:100]}")
        return pd.DataFrame()

def main():
    print("🚀 Pre-Certification Usage by Monthly Cohort")
    print("="*60)
    print("This queries actual product usage in 90 days BEFORE certification")
    print("="*60)
    
    client = get_kusto_client(GH_ANALYTICS_CLUSTER)
    
    # Process last 2 years of certifications by month
    all_results = []
    
    # Start from 2 years ago
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)
    
    current = datetime(start_date.year, start_date.month, 1)
    
    while current < end_date:
        year = current.year
        month = current.month
        
        print(f"\n📊 Processing {year}-{month:02d}...", end=" ")
        
        start = datetime.now()
        df = query_precert_for_month(client, year, month)
        elapsed = (datetime.now() - start).total_seconds()
        
        if not df.empty:
            copilot_rate = df['used_copilot_precert'].sum() / len(df) * 100 if len(df) > 0 else 0
            print(f"✅ {len(df)} users in {elapsed:.1f}s (Copilot: {copilot_rate:.1f}%)")
            all_results.append(df)
        else:
            print(f"No data or failed")
        
        current = current + relativedelta(months=1)
    
    if not all_results:
        print("\n❌ No data collected")
        return
    
    # Combine all results
    df_all = pd.concat(all_results, ignore_index=True)
    
    print("\n" + "="*60)
    print("RESULTS: Pre-Certification Product Usage (90 days before exam)")
    print("="*60)
    
    total = len(df_all)
    
    products = [
        ('Copilot', 'used_copilot_precert'),
        ('Actions', 'used_actions_precert'),
        ('Security', 'used_security_precert'),
        ('Pull Requests', 'used_pr_precert'),
        ('Issues', 'used_issues_precert'),
        ('Code Search', 'used_code_search_precert'),
    ]
    
    print(f"\nTotal certified users analyzed: {total:,}")
    print(f"\nProduct usage in 90 days BEFORE certification:")
    for name, col in products:
        if col in df_all.columns:
            count = df_all[col].sum()
            rate = count / total * 100
            print(f"  {name:<15}: {count:,} ({rate:.1f}%)")
    
    # Average days
    print(f"\nAverage days of usage (among those who used):")
    if 'copilot_days_precert' in df_all.columns:
        copilot_users = df_all[df_all['copilot_days_precert'] > 0]
        if len(copilot_users) > 0:
            print(f"  Copilot: {copilot_users['copilot_days_precert'].mean():.1f} days")
    if 'actions_days_precert' in df_all.columns:
        actions_users = df_all[df_all['actions_days_precert'] > 0]
        if len(actions_users) > 0:
            print(f"  Actions: {actions_users['actions_days_precert'].mean():.1f} days")
    
    # Save results
    output_path = "data/precert_usage_accurate.parquet"
    df_all.to_parquet(output_path, index=False)
    print(f"\n💾 Saved to {output_path}")
    
    # Also save CSV for inspection
    df_all.to_csv("data/precert_usage_accurate.csv", index=False)
    print(f"💾 Saved to data/precert_usage_accurate.csv")

if __name__ == "__main__":
    main()
