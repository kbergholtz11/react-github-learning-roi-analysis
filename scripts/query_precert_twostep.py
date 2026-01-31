#!/usr/bin/env python3
"""
Two-step pre-certification query:
1. Get certified user IDs and exam dates
2. Query product usage ONLY for those users, filtered by pre-cert window
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

def run_query(client: KustoClient, database: str, query: str, timeout_min: int = 5) -> pd.DataFrame:
    props = ClientRequestProperties()
    props.set_option("servertimeout", timedelta(minutes=timeout_min))
    response = client.execute_query(database, query, props)
    return dataframe_from_result_table(response.primary_results[0])

def main():
    print("🚀 Two-Step Pre-Certification Query")
    print("="*60)
    
    client = get_kusto_client(GH_ANALYTICS_CLUSTER)
    
    # Step 1: Get certified users with exam dates (small query)
    print("\n📊 Step 1: Getting certified users with exam dates...")
    
    step1_query = """
    exam_results
    | where passed == true and isnotempty(dotcomid)
    | extend dotcom_id = tolong(dotcomid)
    | where dotcom_id > 0
    | summarize first_exam = min(endtime) by dotcom_id
    | where first_exam >= ago(365d * 2)  // Last 2 years
    | project dotcom_id, first_exam
    """
    
    start = datetime.now()
    df_exams = run_query(client, "ace", step1_query, timeout_min=3)
    elapsed = (datetime.now() - start).total_seconds()
    print(f"   ✅ Got {len(df_exams):,} certified users in {elapsed:.1f}s")
    
    if df_exams.empty:
        print("❌ No exam data")
        return
    
    # Step 2: Query product usage for ONLY these users
    # We'll pass the user IDs directly into the Kusto query
    print(f"\n📊 Step 2: Querying product usage for {len(df_exams):,} users...")
    print("   (This filters to certified users BEFORE scanning product data)")
    
    # Create the user ID list for the query
    user_ids = df_exams['dotcom_id'].tolist()
    
    # We need to batch this - smaller batches to avoid query size limits
    batch_size = 2000
    all_results = []
    
    for i in range(0, len(user_ids), batch_size):
        batch_ids = user_ids[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(user_ids) + batch_size - 1) // batch_size
        
        # Create a datatable of user IDs for efficient lookup
        id_values = ",".join(f"long({int(uid)})" for uid in batch_ids)
        
        step2_query = f"""
        // Create a table of batch user IDs
        let batch_ids = datatable(user_id: long) [{id_values}];
        
        // Get exam dates for these users
        let batch_exams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
            | where passed == true and isnotempty(dotcomid)
            | extend dotcom_id = tolong(dotcomid)
            | where dotcom_id > 0
            | summarize first_exam = min(endtime) by dotcom_id
            | join kind=inner batch_ids on $left.dotcom_id == $right.user_id
            | project dotcom_id, first_exam;

        // Get product usage ONLY for these users, filtering FIRST
        user_daily_activity_per_product
        | join kind=inner batch_ids on $left.user_id == $right.user_id
        | join kind=inner batch_exams on $left.user_id == $right.dotcom_id
        | where day < first_exam and day >= datetime_add('day', -90, first_exam)
        | summarize
            copilot_days = dcountif(day, product has "Copilot"),
            actions_days = dcountif(day, product == "Actions"),
            security_days = dcountif(day, product has_any ("Security", "Dependabot", "CodeQL")),
            pr_days = dcountif(day, product == "Pull Requests"),
            issues_days = dcountif(day, product == "Issues")
        by user_id
        | project 
            dotcom_id = user_id,
            used_copilot = copilot_days > 0,
            used_actions = actions_days > 0,
            used_security = security_days > 0,
            used_pr = pr_days > 0,
            used_issues = issues_days > 0,
            copilot_days,
            actions_days,
            security_days
        """
        
        print(f"   Batch {batch_num}/{total_batches}: {len(batch_ids):,} users...", end=" ")
        
        try:
            start = datetime.now()
            df_batch = run_query(client, "canonical", step2_query, timeout_min=5)
            elapsed = (datetime.now() - start).total_seconds()
            
            if not df_batch.empty:
                copilot_pct = df_batch['used_copilot'].sum() / len(batch_ids) * 100
                print(f"✅ {len(df_batch):,} with activity in {elapsed:.1f}s (Copilot: {copilot_pct:.1f}%)")
                all_results.append(df_batch)
            else:
                print(f"No activity in {elapsed:.1f}s")
                
        except Exception as e:
            print(f"❌ Failed: {str(e)[:80]}")
            continue
    
    if not all_results:
        print("\n❌ No results from any batch")
        return
    
    # Combine results
    df_precert = pd.concat(all_results, ignore_index=True)
    
    print("\n" + "="*60)
    print("RESULTS: Pre-Certification Product Usage")
    print("(Actual usage in 90 days BEFORE certification)")
    print("="*60)
    
    total_certified = len(df_exams)
    total_with_precert = len(df_precert)
    
    print(f"\nTotal certified users (last 2 years): {total_certified:,}")
    print(f"Users with pre-cert activity: {total_with_precert:,} ({total_with_precert/total_certified*100:.1f}%)")
    
    print(f"\nProduct usage in 90 days BEFORE certification:")
    for product, col in [('Copilot', 'used_copilot'), ('Actions', 'used_actions'), 
                         ('Security', 'used_security'), ('PRs', 'used_pr'), ('Issues', 'used_issues')]:
        if col in df_precert.columns:
            count = df_precert[col].sum()
            pct = count / total_certified * 100
            print(f"  {product:<10}: {count:,} ({pct:.1f}%)")
    
    # Save results
    df_precert.to_parquet("data/precert_usage_accurate.parquet", index=False)
    df_precert.to_csv("data/precert_usage_accurate.csv", index=False)
    print(f"\n💾 Saved to data/precert_usage_accurate.parquet")

if __name__ == "__main__":
    main()
