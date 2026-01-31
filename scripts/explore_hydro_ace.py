#!/usr/bin/env python3
"""Deep exploration of hydro and ACE databases for enrichment data."""

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
import pandas as pd

# ============================================================================
# HYDRO DATABASE - User profile, email, company data
# ============================================================================
print("=" * 80)
print("HYDRO DATABASE EXPLORATION")
print("=" * 80)

cluster = "https://gh-analytics.eastus.kusto.windows.net"
kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(cluster)
client = KustoClient(kcsb)

# Try to find user-related tables in hydro
hydro_patterns = [
    "dotcom_v0_users",
    "dotcom_v0_organizations", 
    "dotcom_v0_organization_members",
    "dotcom_v0_emails",
    "dotcom_v0_profiles",
    "github_v0_users",
    "github_v0_orgs",
    "monolith_users",
    "monolith_organizations",
    "hydro_users",
    "users",
    "user_company",
    "user_profile",
]

print("\nChecking hydro tables:")
for table in hydro_patterns:
    query = f"{table} | take 1 | count"
    try:
        result = client.execute_query("hydro", query)
        count = list(result.primary_results[0])[0][0]
        print(f"  ✓ {table}: EXISTS")
        # Get schema for existing tables
        schema_query = f"{table} | take 0 | getschema"
        schema_result = client.execute_query("hydro", schema_query)
        cols = [row[0] for row in schema_result.primary_results[0]]
        print(f"      Columns: {', '.join(cols[:10])}...")
    except Exception as e:
        if "Failed to resolve" not in str(e):
            print(f"  ? {table}: {str(e)[:60]}")

# ============================================================================
# ACE DATABASE - Learning/certification data
# ============================================================================
print("\n" + "=" * 80)
print("ACE DATABASE EXPLORATION")
print("=" * 80)

ace_cluster = "https://cse-analytics.centralus.kusto.windows.net"
ace_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(ace_cluster)
ace_client = KustoClient(ace_kcsb)

# First, try to list databases
print("\nListing ACE tables (via find):")
ace_patterns = [
    "users",
    "user_profiles",
    "learners", 
    "registrations",
    "enrollments",
    "certifications",
    "exams",
    "exam_results",
    "companies",
    "events",
    "learning_paths",
    "courses",
    "credentials",
]

for table in ace_patterns:
    query = f"{table} | take 1 | count"
    try:
        result = ace_client.execute_query("ace", query)
        count = list(result.primary_results[0])[0][0]
        print(f"  ✓ {table}: EXISTS")
        # Get schema
        schema_query = f"{table} | take 0 | getschema"
        schema_result = ace_client.execute_query("ace", schema_query)
        cols = [row[0] for row in schema_result.primary_results[0]]
        print(f"      Columns: {', '.join(cols[:10])}...")
    except Exception as e:
        if "Failed to resolve" not in str(e):
            print(f"  ? {table}: {str(e)[:60]}")

# ============================================================================
# Check what we're currently using from ACE
# ============================================================================
print("\n" + "=" * 80)
print("ACE TABLES WE CURRENTLY USE")
print("=" * 80)

current_ace_tables = [
    "user_exams",
    "certification_exams",
    "events",
    "learner_certifications",
]

for table in current_ace_tables:
    query = f"{table} | take 1 | count"
    try:
        result = ace_client.execute_query("ace", query)
        print(f"  ✓ {table}: EXISTS")
        # Get full schema
        schema_query = f"{table} | take 0 | getschema"
        schema_result = ace_client.execute_query("ace", schema_query)
        print(f"    Full schema:")
        for row in schema_result.primary_results[0]:
            print(f"      {row[0]}: {row[1]}")
    except Exception as e:
        print(f"  ✗ {table}: {str(e)[:80]}")

# ============================================================================
# Explore canonical for additional org/company data
# ============================================================================
print("\n" + "=" * 80)
print("CANONICAL - LOOKING FOR ORG MEMBERSHIP DATA")  
print("=" * 80)

# Check if there's org membership data we can use
query = """
// Sample relationships to understand structure
relationships_all
| where child_type == "User" and parent_type == "Organization"
| take 5
| project child_dotcom_id, parent_dotcom_id, parent_global_id, relationship_type
"""
try:
    result = client.execute_query("canonical", query)
    print("\nSample user->org relationships:")
    for row in result.primary_results[0]:
        print(f"  User {row[0]} -> Org {row[1]} (global: {row[2]}) - {row[3]}")
except Exception as e:
    print(f"Query failed: {e}")

# Check how many users have org relationships
query2 = """
relationships_all
| where child_type == "User" and parent_type == "Organization"
| where isnotempty(parent_global_id)
| summarize users_with_orgs = dcount(child_dotcom_id)
"""
try:
    result = client.execute_query("canonical", query2)
    count = list(result.primary_results[0])[0][0]
    print(f"\nUsers with org memberships: {count:,}")
except Exception as e:
    print(f"Count query failed: {e}")

# ============================================================================
# Check accounts_all for direct user enrichment
# ============================================================================
print("\n" + "=" * 80)
print("ACCOUNTS_ALL - CHECKING FOR USER-LEVEL DATA")
print("=" * 80)

query = """
accounts_all
| where account_type == "User"
| where isnotempty(country_account) or isnotempty(country_billing)
| summarize 
    with_country = count(),
    with_billing_country = countif(isnotempty(country_billing))
"""
try:
    result = client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"Users with country data: {row[0]:,}")
    print(f"Users with billing country: {row[1]:,}")
except Exception as e:
    print(f"Query failed: {e}")

# Sample accounts_all data
query = """
accounts_all
| where account_type == "User"
| where isnotempty(country_account)
| take 5
| project dotcom_id, login, country_account, country_billing, is_paid, plan
"""
try:
    result = client.execute_query("canonical", query)
    print("\nSample user accounts:")
    for row in result.primary_results[0]:
        print(f"  {row}")
except Exception as e:
    print(f"Sample query failed: {e}")

print("\n" + "=" * 80)
print("EXPLORATION COMPLETE")
print("=" * 80)
