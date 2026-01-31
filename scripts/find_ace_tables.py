#!/usr/bin/env python3
"""Find actual ACE table names and explore direct dotcom enrichment."""

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

# ACE Cluster
ace_cluster = "https://cse-analytics.centralus.kusto.windows.net"
ace_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(ace_cluster)
ace_client = KustoClient(ace_kcsb)

print("=" * 80)
print("ACE DATABASE - FINDING ACTUAL TABLE NAMES")
print("=" * 80)

# Try common patterns
ace_patterns = [
    "user", "users", "learner", "learners",
    "registration", "registrations", 
    "enrollment", "enrollments",
    "certification", "certifications",
    "exam", "exams",
    "exam_record", "exam_records",
    "credential", "credentials",
    "event", "events",
    "course", "courses",
    "profile", "profiles",
]

print("\nSearching for tables in ACE database:")
for pattern in ace_patterns:
    for suffix in ["", "s", "_all", "_v1", "_v2"]:
        table = pattern + suffix
        query = f"{table} | take 1 | count"
        try:
            result = ace_client.execute_query("ace", query)
            print(f"  ✓ {table}: EXISTS")
            # Get schema
            schema_query = f"{table} | take 0 | getschema"
            schema_result = ace_client.execute_query("ace", schema_query)
            cols = [row[0] for row in schema_result.primary_results[0]]
            print(f"      Columns: {', '.join(cols[:12])}")
        except:
            pass

# Check our current sync script for the actual ACE table names being used
print("\n" + "=" * 80)
print("CHECKING CURRENT SYNC SCRIPT FOR ACE TABLES")
print("=" * 80)

import re
with open("scripts/sync-enriched-learners.py", "r") as f:
    content = f.read()

# Find ACE-related table references
ace_refs = re.findall(r"database\('ace'\)\.(\w+)", content)
print(f"ACE tables referenced in sync script: {set(ace_refs)}")

# Also check for any table name patterns
table_refs = re.findall(r'\b([a-z_]+)\s*\|', content)
potential_tables = set([t for t in table_refs if any(x in t for x in ['user', 'exam', 'cert', 'enroll', 'event', 'learner'])])
print(f"Potential table names in queries: {potential_tables}")

# ============================================================================
# GH-ANALYTICS - DIRECT USER ENRICHMENT
# ============================================================================
print("\n" + "=" * 80)
print("DIRECT USER ENRICHMENT VIA ACCOUNT_HIERARCHY_DOTCOM_ALL")
print("=" * 80)

gh_cluster = "https://gh-analytics.eastus.kusto.windows.net"
gh_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(gh_cluster)
gh_client = KustoClient(gh_kcsb)

# Check if we can do a direct lookup for user-level company data
# This would be MUCH simpler than going through relationships!
query = """
// Sample direct user company lookup
account_hierarchy_dotcom_all
| where account_type == "User"
| where isnotempty(customer_name) or isnotempty(salesforce_account_name)
| summarize 
    total_users_with_company = count(),
    with_customer_name = countif(isnotempty(customer_name)),
    with_sf_account = countif(isnotempty(salesforce_account_name)),
    with_sf_parent = countif(isnotempty(salesforce_parent_account_name)),
    with_enterprise = countif(isnotempty(enterprise_account_slug))
"""
try:
    result = gh_client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"\nTotal users in account_hierarchy_dotcom_all with company:")
    print(f"  Total: {int(row[0]):,}")
    print(f"  With customer_name: {int(row[1]):,}")
    print(f"  With salesforce_account: {int(row[2]):,}")
    print(f"  With salesforce_parent: {int(row[3]):,}")
    print(f"  With enterprise_slug: {int(row[4]):,}")
except Exception as e:
    print(f"Query failed: {e}")

# The key insight: we can join directly on dotcom_id instead of going through relationships!
print("\n=== KEY INSIGHT ===")
print("account_hierarchy_dotcom_all has dotcom_id as a direct key!")
print("We can enrich users directly without going through relationships!")
print("This could give us company data for 131M+ users!")

# Check what fields are available
query = "account_hierarchy_dotcom_all | take 0 | getschema"
try:
    result = gh_client.execute_query("canonical", query)
    print("\naccount_hierarchy_dotcom_all schema:")
    for row in result.primary_results[0]:
        print(f"  {row[0]}")
except Exception as e:
    print(f"Schema query failed: {e}")
