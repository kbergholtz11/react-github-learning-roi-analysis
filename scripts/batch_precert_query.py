#!/usr/bin/env python3
"""
Batch-based pre-certification query.
Fetches exam dates first, then queries product usage in batches.
"""

import os
import sys
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder, ClientRequestProperties
from azure.kusto.data.helpers import dataframe_from_result_table
from azure.identity import DefaultAzureCredential

GH_ANALYTICS_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"

def get_kusto_client(cluster_uri: str) -> KustoClient:
    credential = DefaultAzureCredential()
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(cluster_uri, credential)
    return KustoClient(kcsb)

def run_query(client: KustoClient, database: str, query: str, timeout_min: int = 5) -> pd.DataFrame:
    props = ClientRequestProperties()
    props.set_option("servertimeout", timedelta(minutes=timeout_min))
    response = client.execute_query(database, query, props)
    return dataframe_from_result_table(response.primary_results[0])

def main():
    print("🚀 Batch-based Pre-Certification Query")
    print("="*60)
    
    client = get_kusto_client(GH_ANALYTICS_CLUSTER)
    
    # Step 1: Get certified users with exam dates (from ACE cluster)
    print("\n📊 Step 1: Fetching certified users with exam dates...")
    step1_query = """
    exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id
    | project dotcom_id, first_exam
    """
    
    start = datetime.now()
    df_exams = run_query(client, "ace", step1_query, timeout_min=5)
    print(f"   Got {len(df_exams)} certified users in {(datetime.now() - start).total_seconds():.1f}s")
    
    if df_exams.empty:
        print("❌ No exam data found")
        return
    
    # Add pre-cert window calculation
    df_exams['first_exam'] = pd.to_datetime(df_exams['first_exam']).dt.tz_localize(None)
    df_exams['precert_start'] = df_exams['first_exam'] - pd.Timedelta(days=90)
    
    # Filter to users certified in last 2 years (more manageable)
    two_years_ago = datetime.now() - timedelta(days=730)
    df_recent = df_exams[df_exams['first_exam'] >= two_years_ago].copy()
    print(f"   Filtered to {len(df_recent)} users certified in last 2 years")
    
    # Step 2: Query product usage in batches
    print("\n📊 Step 2: Querying product usage in batches...")
    
    # Process in batches of 5000 users
    batch_size = 5000
    user_ids = df_recent['dotcom_id'].tolist()
    all_results = []
    
    for i in range(0, len(user_ids), batch_size):
        batch = user_ids[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(user_ids) + batch_size - 1) // batch_size
        
        print(f"   Batch {batch_num}/{total_batches}: {len(batch)} users...")
        
        # Create user list for IN clause
        user_list = ",".join(str(uid) for uid in batch)
        
        # Query product usage for this batch
        batch_query = f"""
        user_daily_activity_per_product
        | where user_id in ({user_list})
        | summarize
            copilot_days = dcountif(day, product has "Copilot"),
            actions_days = dcountif(day, product == "Actions"),
            security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
            pr_days = dcountif(day, product == "Pull Requests"),
            issues_days = dcountif(day, product == "Issues"),
            code_search_days = dcountif(day, product == "Code Search"),
            packages_days = dcountif(day, product == "Packages"),
            projects_days = dcountif(day, product == "Projects"),
            discussions_days = dcountif(day, product == "Discussions"),
            pages_days = dcountif(day, product == "Pages"),
            total_days = dcount(day),
            min_day = min(day),
            max_day = max(day)
        by user_id
        | project user_id, copilot_days, actions_days, security_days, 
                  pr_days, issues_days, code_search_days, packages_days,
                  projects_days, discussions_days, pages_days, total_days,
                  min_day, max_day
        """
        
        try:
            start = datetime.now()
            df_batch = run_query(client, "canonical", batch_query, timeout_min=3)
            elapsed = (datetime.now() - start).total_seconds()
            print(f"      Got {len(df_batch)} users with activity in {elapsed:.1f}s")
            all_results.append(df_batch)
        except Exception as e:
            print(f"      ❌ Batch failed: {str(e)[:100]}")
            continue
    
    if not all_results:
        print("❌ No results from any batch")
        return
    
    # Combine results
    df_usage = pd.concat(all_results, ignore_index=True)
    print(f"\n✅ Total users with product activity: {len(df_usage)}")
    
    # Step 3: Join with exam dates and filter to pre-cert period
    print("\n📊 Step 3: Filtering to pre-certification usage...")
    
    # Merge exam dates with usage
    df_merged = df_usage.merge(
        df_recent[['dotcom_id', 'first_exam', 'precert_start']], 
        left_on='user_id', 
        right_on='dotcom_id',
        how='inner'
    )
    
    # Filter to activity that happened before certification
    # Note: We can only approximate since we have aggregated data
    # If min_day < first_exam, they had some pre-cert activity
    df_merged['max_day'] = pd.to_datetime(df_merged['max_day'])
    df_merged['min_day'] = pd.to_datetime(df_merged['min_day'])
    
    df_precert = df_merged[df_merged['min_day'] < df_merged['first_exam']].copy()
    print(f"   Users with pre-cert activity: {len(df_precert)}")
    
    # Calculate pre-cert adoption rates
    total_certified = len(df_recent)
    
    precert_copilot = (df_precert['copilot_days'] > 0).sum()
    precert_actions = (df_precert['actions_days'] > 0).sum()
    precert_security = (df_precert['security_days'] > 0).sum()
    
    print("\n" + "="*60)
    print("PRE-CERTIFICATION ADOPTION RESULTS (Last 2 Years)")
    print("="*60)
    print(f"Total certified users: {total_certified:,}")
    print(f"Users with any pre-cert activity: {len(df_precert):,} ({len(df_precert)/total_certified*100:.1f}%)")
    print(f"\nPre-cert product adoption:")
    print(f"  Copilot: {precert_copilot:,} ({precert_copilot/total_certified*100:.1f}%)")
    print(f"  Actions: {precert_actions:,} ({precert_actions/total_certified*100:.1f}%)")
    print(f"  Security: {precert_security:,} ({precert_security/total_certified*100:.1f}%)")
    
    # Save results
    output_path = "data/precert_usage.csv"
    df_precert.to_csv(output_path, index=False)
    print(f"\n💾 Saved results to {output_path}")

if __name__ == "__main__":
    main()
