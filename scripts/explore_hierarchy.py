#!/usr/bin/env python3
"""
Explore Kusto table schemas to figure out the right join for account_hierarchy_global_all
"""

from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

def main():
    credential = DefaultAzureCredential()
    
    # Connect to gh-analytics cluster (canonical database)
    gh_cluster = "https://gh-analytics.eastus.kusto.windows.net"
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(gh_cluster, credential)
    client = KustoClient(kcsb)
    
    print("=== Exploring relationships_all schema ===")
    try:
        response = client.execute_query("canonical", """
            relationships_all
            | getschema
            | project ColumnName, ColumnType
        """)
        for row in response.primary_results[0].rows:
            print(f"  {row[0]}: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n=== Sample relationships_all data ===")
    try:
        response = client.execute_query("canonical", """
            relationships_all
            | where child_type == "User" and parent_type == "Organization"
            | take 5
        """)
        cols = [col.column_name for col in response.primary_results[0].columns]
        print(f"  Columns: {cols}")
        for row in response.primary_results[0].rows:
            print(f"  Row: {dict(zip(cols, row))}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n=== Exploring account_hierarchy_global_all schema ===")
    try:
        response = client.execute_query("canonical", """
            account_hierarchy_global_all
            | getschema
            | project ColumnName, ColumnType
        """)
        for row in response.primary_results[0].rows:
            print(f"  {row[0]}: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n=== Sample account_hierarchy_global_all Organization data ===")
    try:
        response = client.execute_query("canonical", """
            account_hierarchy_global_all
            | where account_type == "Organization"
            | where isnotempty(customer_name)
            | take 5
            | project login, customer_name, customer_id, salesforce_account_name, enterprise_account_slug
        """)
        cols = [col.column_name for col in response.primary_results[0].columns]
        print(f"  Columns: {cols}")
        for row in response.primary_results[0].rows:
            print(f"  Row: {dict(zip(cols, row))}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n=== Check if accounts_all has dotcom_id mapping ===")
    try:
        response = client.execute_query("canonical", """
            accounts_all
            | getschema
            | project ColumnName, ColumnType
            | where ColumnName contains "id" or ColumnName contains "login"
        """)
        for row in response.primary_results[0].rows:
            print(f"  {row[0]}: {row[1]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
