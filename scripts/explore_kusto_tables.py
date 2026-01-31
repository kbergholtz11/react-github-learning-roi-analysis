#!/usr/bin/env python3
"""Explore Kusto tables for potential company attribution sources."""

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

cluster = "https://gh-analytics.eastus.kusto.windows.net"
kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(cluster)
client = KustoClient(kcsb)

# Check hydro for email/user tables
tables_to_check = [
    ("hydro", "users"),
    ("hydro", "user_emails"),
    ("hydro", "verified_emails"),
    ("hydro", "dotcom_users"),
    ("hydro", "user_verified_domains"),
    ("canonical", "relationships_all"),
]

print("=== Checking for email/user tables ===")
for db, table in tables_to_check:
    query = f"{table} | take 1 | count"
    try:
        result = client.execute_query(db, query)
        print(f"  {db}.{table}: EXISTS")
    except Exception as e:
        if "Semantic error" in str(e):
            pass
        else:
            print(f"  {db}.{table}: ERROR - {str(e)[:50]}")

# Check relationships_all schema
print("\n=== relationships_all columns ===")
query = "relationships_all | take 0 | getschema"
result = client.execute_query("canonical", query)
for row in result.primary_results[0]:
    print(f"  {row[0]}: {row[1]}")

# Check if we can find users with verified corporate domains
print("\n=== Sample relationships with org info ===")
query = """
relationships_all
| where isnotempty(parent_global_id)
| take 5
| project user_id, parent_global_id, login, org_login
"""
try:
    result = client.execute_query("canonical", query)
    for row in result.primary_results[0]:
        print(f"  {row}")
except Exception as e:
    print(f"  Query failed: {e}")
