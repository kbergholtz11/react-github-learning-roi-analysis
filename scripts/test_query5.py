#!/usr/bin/env python3
"""
Test Query 5 to verify the join via global_id works correctly
"""

from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

QUERY_5_TEST = """
// Quick test of Query 5 join strategy
// Get a few user-to-org relationships with parent_global_id
let sample_user_orgs = relationships_all
| where child_type == "User" and parent_type == "Organization"
| take 100
| summarize arg_max(day, *) by child_dotcom_id, parent_dotcom_id, parent_global_id;

// Get org details from account_hierarchy_global_all
let org_details = account_hierarchy_global_all
| where account_type == "Organization"
| where isnotempty(customer_name)
| summarize arg_max(day, *) by account_global_id;

// Join via global_id
sample_user_orgs
| join kind=leftouter org_details on $left.parent_global_id == $right.account_global_id
| project
    dotcom_id = child_dotcom_id,
    org_dotcom_id = parent_dotcom_id,
    org_name = login,
    org_customer_name = customer_name,
    org_salesforce_account_name = salesforce_account_name,
    org_salesforce_parent_name = salesforce_parent_account_name,
    has_customer = isnotempty(customer_name)
| take 20
"""

def main():
    credential = DefaultAzureCredential()
    
    gh_cluster = "https://gh-analytics.eastus.kusto.windows.net"
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(gh_cluster, credential)
    client = KustoClient(kcsb)
    
    print("=== Testing Query 5 join via global_id ===")
    try:
        response = client.execute_query("canonical", QUERY_5_TEST)
        cols = [col.column_name for col in response.primary_results[0].columns]
        print(f"Columns: {cols}")
        print(f"Row count: {len(response.primary_results[0].rows)}")
        
        matched = 0
        for row in response.primary_results[0].rows:
            row_dict = dict(zip(cols, row))
            if row_dict.get('has_customer'):
                matched += 1
                print(f"  Matched: org={row_dict.get('org_name')}, customer={row_dict.get('org_customer_name')}")
        
        print(f"\nMatched {matched} out of {len(response.primary_results[0].rows)} rows")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
