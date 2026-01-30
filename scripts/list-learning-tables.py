#!/usr/bin/env python3
"""List available learning-related tables in Kusto."""

from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

def list_tables(cluster_url, database):
    """List tables in a database."""
    credential = DefaultAzureCredential()
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(cluster_url, credential)
    client = KustoClient(kcsb)
    
    response = client.execute_mgmt(database, ".show tables")
    tables = [row[0] for row in response.primary_results[0].rows]
    return tables

def main():
    # GH Analytics cluster
    gh_cluster = "https://gh-analytics.eastus.kusto.windows.net"
    
    # Check hydro database
    print("=" * 60)
    print("HYDRO DATABASE - Learning Tables")
    print("=" * 60)
    
    tables = list_tables(gh_cluster, "hydro")
    
    # Keywords for learning
    keywords = ['learn', 'skill', 'doc', 'page', 'education', 'train', 
                'onboard', 'signup', 'analytic', 'view', 'user']
    
    learning_tables = [t for t in tables if any(k in t.lower() for k in keywords)]
    
    print(f"\n📚 Learning-related tables ({len(learning_tables)}):")
    for t in sorted(learning_tables):
        print(f"   - {t}")
    
    print(f"\n📊 All tables in hydro ({len(tables)}):")
    for t in sorted(tables):
        print(f"   - {t}")
    
    # Check ace database
    print("\n" + "=" * 60)
    print("ACE DATABASE - Learning Tables")
    print("=" * 60)
    
    ace_tables = list_tables(gh_cluster, "ace")
    ace_learning = [t for t in ace_tables if any(k in t.lower() for k in 
        ['event', 'user', 'cert', 'exam', 'registr', 'learn'])]
    
    print(f"\n📚 Learning-related tables ({len(ace_learning)}):")
    for t in sorted(ace_learning):
        print(f"   - {t}")

if __name__ == "__main__":
    main()
