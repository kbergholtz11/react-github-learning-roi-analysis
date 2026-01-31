#!/usr/bin/env python3
"""Deep dive into snapshots database and account_hierarchy_dotcom_all for enrichment."""

from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

gh_cluster = "https://gh-analytics.eastus.kusto.windows.net"
gh_kcsb = KustoConnectionStringBuilder.with_az_cli_authentication(gh_cluster)
gh_client = KustoClient(gh_kcsb)

# ============================================================================
# SNAPSHOTS DATABASE
# ============================================================================
print("=" * 80)
print("SNAPSHOTS DATABASE EXPLORATION")
print("=" * 80)

# List tables in snapshots
snapshot_tables = [
    "accounts_snapshot",
    "users_snapshot", 
    "organizations_snapshot",
    "relationships_snapshot",
    "account_hierarchy_snapshot",
    "daily_accounts",
    "daily_users",
    "daily_relationships",
]

print("\nChecking snapshots database tables:")
for table in snapshot_tables:
    query = f"{table} | take 1 | count"
    try:
        result = gh_client.execute_query("snapshots", query)
        print(f"  ✓ {table}: EXISTS")
        # Get schema
        schema_query = f"{table} | take 0 | getschema"
        schema_result = gh_client.execute_query("snapshots", schema_query)
        cols = [row[0] for row in schema_result.primary_results[0]]
        print(f"      Columns: {', '.join(cols[:15])}")
    except Exception as e:
        if "Failed to resolve" not in str(e):
            print(f"  ? {table}: {str(e)[:60]}")

# ============================================================================
# ACCOUNT_HIERARCHY_DOTCOM_ALL - DIRECT USER LOOKUP
# ============================================================================
print("\n" + "=" * 80)
print("ACCOUNT_HIERARCHY_DOTCOM_ALL - DIRECT USER COMPANY LOOKUP")
print("=" * 80)

# This table has 131M users with customer_name!
# Let's see if we can use it directly for our learners

# Sample query to understand the data
query = """
account_hierarchy_dotcom_all
| where account_type == "User"
| where isnotempty(customer_name)
| take 10
| project dotcom_id, login, customer_name, salesforce_account_name, salesforce_parent_account_name, enterprise_account_slug
"""
try:
    result = gh_client.execute_query("canonical", query)
    print("\nSample users with company data:")
    for row in result.primary_results[0]:
        print(f"  {row[0]} ({row[1]}): {row[2]}")
except Exception as e:
    print(f"Query failed: {e}")

# Check overlap with our learner population
print("\n=== CHECKING OVERLAP WITH OUR LEARNERS ===")

# First, check how many of our learners exist in this table
query = """
let ace_users = cluster('cse-analytics.centralus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcom_id)
    | distinct dotcom_id;
account_hierarchy_dotcom_all
| where account_type == "User"
| where dotcom_id in (ace_users)
| summarize 
    total = count(),
    with_customer = countif(isnotempty(customer_name)),
    with_sf_account = countif(isnotempty(salesforce_account_name)),
    with_enterprise = countif(isnotempty(enterprise_account_slug))
"""
try:
    result = gh_client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"\nACE learners in account_hierarchy_dotcom_all:")
    print(f"  Total: {int(row[0]):,}")
    print(f"  With customer_name: {int(row[1]):,}")
    print(f"  With salesforce_account: {int(row[2]):,}")
    print(f"  With enterprise: {int(row[3]):,}")
except Exception as e:
    print(f"Query failed: {e}")

# ============================================================================
# CHECK WHAT WE'RE MISSING IN CURRENT ENRICHMENT
# ============================================================================
print("\n" + "=" * 80)
print("COMPARING CURRENT VS POTENTIAL ENRICHMENT")
print("=" * 80)

# Our current Query 5 joins via relationships -> account_hierarchy_global_all
# But account_hierarchy_dotcom_all can be joined DIRECTLY via dotcom_id!

query = """
// Users who have company data in dotcom table but might not in our current approach
let ace_users = cluster('cse-analytics.centralus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcom_id)
    | project dotcom_id = tolong(dotcom_id);

// Direct lookup in dotcom hierarchy
let direct_lookup = account_hierarchy_dotcom_all
    | where account_type == "User"
    | where dotcom_id in (ace_users)
    | where isnotempty(customer_name) or isnotempty(salesforce_account_name)
    | project dotcom_id, customer_name, salesforce_account_name
    | summarize count();

// Via relationships (our current method)
let via_relationships = relationships_all
    | where child_type == "User"
    | where child_dotcom_id in (ace_users)
    | where isnotempty(parent_global_id)
    | join kind=inner (
        account_hierarchy_global_all
        | where isnotempty(customer_name) or isnotempty(salesforce_account_name)
    ) on $left.parent_global_id == $right.account_global_id
    | summarize count();

print direct_count = toscalar(direct_lookup), relationship_count = toscalar(via_relationships)
"""
try:
    result = gh_client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"\nComparison of enrichment methods:")
    print(f"  Direct dotcom lookup: {int(row[0]):,} users with company")
    print(f"  Via relationships: {int(row[1]):,} users with company")
except Exception as e:
    print(f"Query failed: {e}")

# ============================================================================
# CHECK ACCOUNTS_ALL FOR ADDITIONAL USER DATA
# ============================================================================
print("\n" + "=" * 80)
print("ACCOUNTS_ALL - USER COUNTRY DATA WE MIGHT BE MISSING")
print("=" * 80)

query = """
let ace_users = cluster('cse-analytics.centralus.kusto.windows.net').database('ace').users
    | where isnotempty(dotcom_id)
    | project dotcom_id = tolong(dotcom_id);
    
accounts_all
| where account_type == "User"
| where dotcom_id in (ace_users)
| summarize 
    total = count(),
    with_country = countif(isnotempty(country_account)),
    with_billing_country = countif(isnotempty(country_billing)),
    is_paid = countif(is_paid == true),
    is_education = countif(is_education == true)
"""
try:
    result = gh_client.execute_query("canonical", query)
    row = list(result.primary_results[0])[0]
    print(f"\nACE learners in accounts_all:")
    print(f"  Total: {int(row[0]):,}")
    print(f"  With country: {int(row[1]):,}")
    print(f"  With billing country: {int(row[2]):,}")
    print(f"  Is paid: {int(row[3]):,}")
    print(f"  Is education: {int(row[4]):,}")
except Exception as e:
    print(f"Query failed: {e}")

print("\n" + "=" * 80)
print("EXPLORATION COMPLETE")
print("=" * 80)
