#!/usr/bin/env python3
"""Find ace_v0 tables in Kusto clusters."""

from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

cred = DefaultAzureCredential()

# Try CSE-Analytics cluster
print("=" * 60)
print("CSE-Analytics Cluster (cse-analytics.centralus)")
print("=" * 60)
kcsb = KustoConnectionStringBuilder.with_azure_token_credential(
    'https://cse-analytics.centralus.kusto.windows.net', cred)
client = KustoClient(kcsb)

print("\nDatabases:")
result = client.execute_mgmt('ACE', '.show databases')
for row in result.primary_results[0].rows:
    print(f"  {row[0]}")

print("\nACE tables with v0/exam/eligib/absent:")
result = client.execute_mgmt('ACE', '.show tables')
for row in result.primary_results[0].rows:
    name = row[0]
    if 'v0' in name.lower() or 'exam' in name.lower() or 'eligib' in name.lower() or 'absent' in name.lower():
        print(f"  {name}")

# Try GH-Analytics cluster
print("\n" + "=" * 60)
print("GH-Analytics Cluster (gh-analytics.eastus)")
print("=" * 60)
kcsb2 = KustoConnectionStringBuilder.with_azure_token_credential(
    'https://gh-analytics.eastus.kusto.windows.net', cred)
client2 = KustoClient(kcsb2)

# Check if there's an ace database with v0 tables
for db in ['ace', 'hydro', 'canonical']:
    try:
        print(f"\n{db} database tables with v0/exam/eligib/absent:")
        result = client2.execute_mgmt(db, '.show tables')
        found = False
        for row in result.primary_results[0].rows:
            name = row[0]
            if 'v0' in name.lower() or 'exam' in name.lower() or 'eligib' in name.lower() or 'absent' in name.lower():
                print(f"  {name}")
                found = True
        if not found:
            print("  (none found)")
    except Exception as e:
        print(f"  Error: {str(e)[:80]}")
