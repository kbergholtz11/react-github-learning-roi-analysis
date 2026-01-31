#!/usr/bin/env python3
"""Comprehensive exploration of all Kusto tables for enrichment opportunities."""

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
import pandas as pd

cluster = "https://gh-analytics.eastus.kusto.windows.net"
kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(cluster)
client = KustoClient(kcsb)

# List ALL tables in canonical database
print("=" * 80)
print("EXPLORING ALL TABLES IN CANONICAL DATABASE")
print("=" * 80)

# Get table list using a workaround query
query = """
cluster('gh-analytics.eastus.kusto.windows.net').database('canonical').['Information.Tables']
| project TableName
| order by TableName asc
"""
try:
    result = client.execute_query("canonical", query)
    tables = [row[0] for row in result.primary_results[0]]
    print(f"\nFound {len(tables)} tables in canonical database:")
    for t in tables:
        print(f"  {t}")
except Exception as e:
    print(f"Information.Tables failed: {e}")
    # Try alternative approach - query known table patterns
    pass

# Tables to explore for enrichment data
tables_to_explore = [
    # User/Account tables
    "users_all",
    "accounts_all", 
    "organizations_all",
    "orgs_all",
    
    # Relationship tables
    "relationships_all",
    "org_members_all",
    "team_members_all",
    
    # Verified/Email tables
    "verified_domains_all",
    "verified_emails_all", 
    "email_domains_all",
    "org_verified_domains",
    
    # Company/Customer tables
    "customers_all",
    "enterprises_all",
    "enterprise_accounts_all",
    
    # Hierarchy tables
    "account_hierarchy_global_all",
    "account_hierarchy_dotcom_all",
    "account_hierarchy_enterprise_all",
    
    # Activity/Usage tables
    "user_activity_all",
    "active_users_all",
    
    # Profile/Bio tables
    "user_profiles_all",
    "profiles_all",
    
    # Snapshot tables
    "users_snapshot",
    "accounts_snapshot",
    "relationships_snapshot",
    "org_members_snapshot",
]

print("\n" + "=" * 80)
print("CHECKING SPECIFIC TABLE EXISTENCE")
print("=" * 80)

existing_tables = []
for table in tables_to_explore:
    query = f"{table} | take 1 | count"
    try:
        result = client.execute_query("canonical", query)
        count = list(result.primary_results[0])[0][0]
        print(f"  ✓ {table}: EXISTS")
        existing_tables.append(table)
    except Exception as e:
        if "Semantic error" in str(e) or "Failed to resolve" in str(e):
            pass  # Table doesn't exist
        else:
            print(f"  ? {table}: ERROR - {str(e)[:60]}")

# For tables that exist, get their schemas
print("\n" + "=" * 80)
print("DETAILED SCHEMA FOR EXISTING TABLES")
print("=" * 80)

for table in existing_tables:
    print(f"\n--- {table} ---")
    query = f"{table} | take 0 | getschema"
    try:
        result = client.execute_query("canonical", query)
        for row in result.primary_results[0]:
            print(f"  {row[0]}: {row[1]}")
    except Exception as e:
        print(f"  Schema query failed: {e}")

# Check hydro database for additional tables
print("\n" + "=" * 80)
print("CHECKING HYDRO DATABASE FOR USER/PROFILE DATA")
print("=" * 80)

hydro_tables = [
    "users",
    "user_profiles",
    "user_emails",
    "organizations", 
    "org_members",
    "verified_domains",
    "dotcom_v0_users",
    "dotcom_v0_organizations",
]

for table in hydro_tables:
    query = f"{table} | take 1 | count"
    try:
        result = client.execute_query("hydro", query)
        print(f"  ✓ hydro.{table}: EXISTS")
    except:
        pass

# Check ACE database tables we might be missing
print("\n" + "=" * 80)
print("CHECKING ACE DATABASE FOR ADDITIONAL LEARNER DATA")
print("=" * 80)

ace_tables = [
    "users",
    "profiles",
    "user_companies",
    "company_mappings",
    "registrations",
    "enrollments",
    "certifications",
    "exam_results",
    "learning_paths",
]

ace_cluster = "https://cse-analytics.centralus.kusto.windows.net"
ace_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(ace_cluster)
ace_client = KustoClient(ace_kcsb)

for table in ace_tables:
    query = f"{table} | take 1 | count"
    try:
        result = ace_client.execute_query("ace", query)
        print(f"  ✓ ace.{table}: EXISTS")
    except:
        pass

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)
