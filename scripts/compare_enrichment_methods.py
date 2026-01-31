#!/usr/bin/env python3
"""Compare direct dotcom enrichment vs current relationship-based approach."""

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

gh_cluster = "https://gh-analytics.eastus.kusto.windows.net"
gh_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(gh_cluster)
gh_client = KustoClient(gh_kcsb)

print("=" * 80)
print("COMPARING ENRICHMENT APPROACHES")
print("=" * 80)

# Get sample dotcom_ids from our current enriched data
import pandas as pd
df = pd.read_parquet("data/learners_enriched.parquet")
sample_ids = df[df['dotcom_id'] > 0]['dotcom_id'].head(10000).tolist()
sample_ids_str = ",".join([str(int(x)) for x in sample_ids])

print(f"\nTesting with {len(sample_ids):,} sample learner dotcom_ids...")

# Method 1: Direct lookup in account_hierarchy_dotcom_all
query1 = f"""
let test_ids = dynamic([{sample_ids_str}]);
account_hierarchy_dotcom_all
| where account_type == "User"
| where dotcom_id in (test_ids)
| summarize 
    total = count(),
    with_customer = countif(isnotempty(customer_name)),
    with_sf_account = countif(isnotempty(salesforce_account_name)),
    with_sf_parent = countif(isnotempty(salesforce_parent_account_name)),
    with_enterprise = countif(isnotempty(enterprise_account_slug)),
    with_country = countif(isnotempty(account_country))
"""
try:
    result = gh_client.execute_query("canonical", query1)
    row = list(result.primary_results[0])[0]
    print(f"\n=== METHOD 1: Direct account_hierarchy_dotcom_all lookup ===")
    print(f"  Matched: {int(row[0]):,} / {len(sample_ids):,}")
    print(f"  With customer_name: {int(row[1]):,}")
    print(f"  With salesforce_account: {int(row[2]):,}")
    print(f"  With salesforce_parent: {int(row[3]):,}")
    print(f"  With enterprise_slug: {int(row[4]):,}")
    print(f"  With country: {int(row[5]):,}")
except Exception as e:
    print(f"Query 1 failed: {e}")

# Method 2: Via relationships (current approach)
query2 = f"""
let test_ids = dynamic([{sample_ids_str}]);
relationships_all
| where child_type == "User"
| where child_dotcom_id in (test_ids)
| where isnotempty(parent_global_id)
| join kind=inner (
    account_hierarchy_global_all
    | project account_global_id, customer_name, salesforce_account_name, salesforce_parent_account_name, account_country
) on $left.parent_global_id == $right.account_global_id
| summarize 
    total = dcount(child_dotcom_id),
    with_customer = dcountif(child_dotcom_id, isnotempty(customer_name)),
    with_sf_account = dcountif(child_dotcom_id, isnotempty(salesforce_account_name)),
    with_sf_parent = dcountif(child_dotcom_id, isnotempty(salesforce_parent_account_name)),
    with_country = dcountif(child_dotcom_id, isnotempty(account_country))
"""
try:
    result = gh_client.execute_query("canonical", query2)
    row = list(result.primary_results[0])[0]
    print(f"\n=== METHOD 2: Via relationships → account_hierarchy_global_all ===")
    print(f"  Matched: {int(row[0]):,} / {len(sample_ids):,}")
    print(f"  With customer_name: {int(row[1]):,}")
    print(f"  With salesforce_account: {int(row[2]):,}")
    print(f"  With salesforce_parent: {int(row[3]):,}")
    print(f"  With country: {int(row[4]):,}")
except Exception as e:
    print(f"Query 2 failed: {e}")

# Method 3: Combine both (union)
print("\n=== RECOMMENDATION ===")
print("Use BOTH methods:")
print("1. Direct lookup in account_hierarchy_dotcom_all for user-level company data")
print("2. Relationship-based for org-inherited company data")
print("This will maximize coverage!")

# Check accounts_all for additional country data
query3 = f"""
let test_ids = dynamic([{sample_ids_str}]);
accounts_all
| where account_type == "User"
| where dotcom_id in (test_ids)
| summarize 
    total = count(),
    with_country = countif(isnotempty(country_account)),
    with_billing_country = countif(isnotempty(country_billing)),
    is_paid = countif(is_paid == true),
    is_education = countif(is_education == true)
"""
try:
    result = gh_client.execute_query("canonical", query3)
    row = list(result.primary_results[0])[0]
    print(f"\n=== ACCOUNTS_ALL - ADDITIONAL USER DATA ===")
    print(f"  Matched: {int(row[0]):,} / {len(sample_ids):,}")
    print(f"  With country: {int(row[1]):,}")
    print(f"  With billing country: {int(row[2]):,}")
    print(f"  Is paid: {int(row[3]):,}")
    print(f"  Is education: {int(row[4]):,}")
except Exception as e:
    print(f"Query 3 failed: {e}")
