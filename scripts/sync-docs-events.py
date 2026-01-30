#!/usr/bin/env python3
"""Quick sync for GitHub Docs and Events data."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import csv
from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

GH_CLUSTER = "https://gh-analytics.eastus.kusto.windows.net"
DATA_DIR = Path(__file__).parent.parent / "data"


def main():
    print("Connecting to GH Analytics cluster...")
    credential = DefaultAzureCredential()
    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(GH_CLUSTER, credential)
    client = KustoClient(kcsb)
    
    # Sync GitHub Docs
    print("Syncing GitHub Docs...")
    docs_query = """
    cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').docs_v0_page_event
    | where timestamp >= datetime(2024-01-01)
    | extend dotcom_user = tostring(context.dotcom_user)
    | where isnotempty(dotcom_user) and dotcom_user != ""
    | extend product_area = tostring(context.path_product)
    | summarize
        docs_page_views = count(),
        docs_products_count = dcount(product_area),
        first_docs_visit = min(timestamp),
        last_docs_visit = max(timestamp)
      by dotcom_user
    | where docs_page_views > 0
    """
    response = client.execute_query("hydro", docs_query)
    columns = [col.column_name for col in response.primary_results[0].columns]
    rows = [dict(zip(columns, row)) for row in response.primary_results[0].rows]
    print(f"  Retrieved {len(rows):,} users")
    
    with open(DATA_DIR / "github_docs.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            for k, v in row.items():
                if hasattr(v, "isoformat"):
                    row[k] = v.isoformat()
            writer.writerow(row)
    print("  Saved to github_docs.csv")
    
    # Sync Events
    print("Syncing Events...")
    events_query = """
    cluster('gh-analytics.eastus.kusto.windows.net').database('ace').event_registrants
    | where updateddate >= datetime(2024-01-01)
    | summarize
        events_registered = dcount(eventid),
        events_attended = dcountif(eventid, attendancetype == "Full" or attendancetype == "Partial"),
        events_no_show = dcountif(eventid, attendancetype == "No Show" or isempty(attendancetype)),
        first_event_date = min(updateddate),
        last_event_date = max(updateddate),
        event_categories = make_set(eventcategory, 10)
      by user_handle = userhandle
    | where isnotempty(user_handle)
    """
    response2 = client.execute_query("ace", events_query)
    columns2 = [col.column_name for col in response2.primary_results[0].columns]
    rows2 = [dict(zip(columns2, row)) for row in response2.primary_results[0].rows]
    print(f"  Retrieved {len(rows2):,} users")
    
    with open(DATA_DIR / "events.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns2)
        writer.writeheader()
        for row in rows2:
            for k, v in row.items():
                if hasattr(v, "isoformat"):
                    row[k] = v.isoformat()
                elif isinstance(v, list):
                    row[k] = ",".join(str(x) for x in v)
            writer.writerow(row)
    print("  Saved to events.csv")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
