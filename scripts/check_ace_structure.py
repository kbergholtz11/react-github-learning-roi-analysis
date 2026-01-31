#!/usr/bin/env python3
"""Check ACE cluster and database structure."""

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

# Check ACE cluster structure
ace_cluster = "https://cse-analytics.centralus.kusto.windows.net"
ace_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(ace_cluster)
ace_client = KustoClient(ace_kcsb)

# List databases in ACE cluster
print("=== ACE CLUSTER DATABASES ===")
try:
    query = ".show databases"
    result = ace_client.execute("ace", query)
    for row in result.primary_results[0]:
        print(f"  {row[0]}")
except Exception as e:
    print(f"Failed: {e}")

# Check current sync script to see what ACE tables/queries we use
print("\n=== CHECKING SYNC SCRIPT FOR ACE QUERIES ===")
import re
with open("scripts/sync-enriched-learners.py", "r") as f:
    content = f.read()
    
# Find all cluster references
clusters = re.findall(r'cluster\([\'"]([^\'"]+)[\'"]\)', content)
print(f"Clusters referenced: {set(clusters)}")

# Find database references  
databases = re.findall(r'database\([\'"]([^\'"]+)[\'"]\)', content)
print(f"Databases referenced: {set(databases)}")

# Check canonical cluster for more tables
print("\n=== CANONICAL - ADDITIONAL TABLE EXPLORATION ===")
gh_cluster = "https://gh-analytics.eastus.kusto.windows.net"
gh_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(gh_cluster)
gh_client = KustoClient(gh_kcsb)

# Sample accounts_all to understand user country data we might be missing
query = """
accounts_all
| where account_type == "User"
| summarize 
    total_users = count(),
    with_country = countif(isnotempty(country_account)),
    with_billing_country = countif(isnotempty(country_billing)),
    is_paid_count = countif(is_paid == true),
    is_education_count = countif(is_education == true)
"""
try:
    result = gh_client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"\naccounts_all User stats:")
    print(f"  Total users: {int(row[0]):,}")
    print(f"  With country: {int(row[1]):,}")
    print(f"  With billing country: {int(row[2]):,}")
    print(f"  Is paid: {int(row[3]):,}")
    print(f"  Is education: {int(row[4]):,}")
except Exception as e:
    print(f"Query failed: {e}")

# Check account_hierarchy_dotcom_all - this might give us more company data
print("\n=== ACCOUNT HIERARCHY DOTCOM - COMPANY DATA POTENTIAL ===")
query = """
account_hierarchy_dotcom_all
| where account_type == "User"
| summarize 
    total_users = count(),
    with_customer_name = countif(isnotempty(customer_name)),
    with_sf_account = countif(isnotempty(salesforce_account_name)),
    with_enterprise = countif(isnotempty(enterprise_account_slug))
"""
try:
    result = gh_client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"account_hierarchy_dotcom_all User stats:")
    print(f"  Total users: {int(row[0]):,}")
    print(f"  With customer_name: {int(row[1]):,}")
    print(f"  With salesforce_account: {int(row[2]):,}")
    print(f"  With enterprise_account: {int(row[3]):,}")
except Exception as e:
    print(f"Query failed: {e}")

# Check relationships for org membership that could give company attribution
print("\n=== RELATIONSHIPS - USER TO ORG MAPPINGS ===")
query = """
relationships_all
| where child_type == "User" and parent_type == "Organization"
| where relationship_type != "pending_org_invitation"
| summarize 
    total_memberships = count(),
    unique_users = dcount(child_dotcom_id),
    unique_orgs = dcount(parent_dotcom_id)
"""
try:
    result = gh_client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"Active org memberships:")
    print(f"  Total memberships: {int(row[0]):,}")
    print(f"  Unique users: {int(row[1]):,}")
    print(f"  Unique orgs: {int(row[2]):,}")
except Exception as e:
    print(f"Query failed: {e}")

# Check what relationship types exist
print("\n=== RELATIONSHIP TYPES ===")
query = """
relationships_all
| where child_type == "User"
| summarize count() by relationship_type
| order by count_ desc
"""
try:
    result = gh_client.execute_query("canonical", query)
    for row in result.primary_results[0]:
        print(f"  {row[0]}: {int(row[1]):,}")
except Exception as e:
    print(f"Query failed: {e}")
