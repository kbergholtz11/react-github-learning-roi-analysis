#!/usr/bin/env python3
"""
Sync Individual Exam Records

DEPRECATED: Use sync-all-data.py instead for comprehensive sync.

This script is kept for backwards compatibility but sync-all-data.py
provides a more complete solution that syncs all data sources.

Run: python scripts/sync-all-data.py --kusto-only
"""

import csv
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

OUTPUT_FILE = "data/individual_exams.csv"

# Simplified query that works with current table structure
# Note: Uses exam_results for FY22-25 and pearson_exam_results for FY26
INDIVIDUAL_EXAMS_QUERY = """
// FY22-25 exam results with calculated scores from gh-analytics
let FY22_25_Records = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | extend
        email = tolower(email),
        exam_code = examcode,
        exam_name = examname,
        exam_date = endtime,
        exam_status = case(passed == true, "Passed", "Failed"),
        total_questions = toint(correct) + toint(incorrect),
        score_percent = iff(toint(correct) + toint(incorrect) > 0,
                           round(100.0 * toint(correct) / (toint(correct) + toint(incorrect)), 1),
                           0.0),
        source = "FY22-25"
    | where isnotempty(email)
    | project email, exam_code, exam_name, exam_date, exam_status, score_percent, source;

// FY26 Pearson data
let FY26_Records = cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
    | extend
        email = tolower(['Candidate Email']),
        exam_code = ['Exam Series Code'],
        exam_name = ['Exam Title'],
        exam_date = Date,
        exam_status = case(
            ['Total Passed'] > 0, "Passed",
            ['Total Failed'] > 0, "Failed",
            ['Registration Status'] == "No Show", "No Show",
            ['Registration Status'] == "Absent", "Absent",
            ['Registration Status'] == "Canceled", "Cancelled",
            ['Registration Status'] == "Scheduled", "Scheduled",
            "Registered"
        ),
        score_percent = todouble(['Score']),
        source = "FY26"
    | where isnotempty(email)
    | project email, exam_code, exam_name, exam_date, exam_status, score_percent, source;

// Combine all records
union FY22_25_Records, FY26_Records
| order by email asc, exam_date asc
"""

# Certification name normalization
CERT_NAME_MAP = {
    "ACTIONS": "GitHub Actions",
    "ADMIN": "GitHub Administration",
    "GHAS": "GitHub Advanced Security",
    "GHF": "GitHub Foundations",
    "COPILOT": "GitHub Copilot",
    "GH-100": "GitHub Administration",
    "GH-200": "GitHub Actions",
    "GH-300": "GitHub Copilot",
    "GH-400": "GitHub Advanced Security",
}


def normalize_exam_name(name: str) -> str:
    """Normalize exam name to standard format."""
    if not name:
        return name
    upper = name.strip().upper()
    if upper in CERT_NAME_MAP:
        return CERT_NAME_MAP[upper]
    # Check if it's already a full name
    if name.startswith("GitHub "):
        return name
    return name


def run_kusto_query(query: str, cluster_uri: str):
    """Execute query using Azure Kusto SDK."""
    try:
        from azure.identity import DefaultAzureCredential
        from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

        print(f"🔗 Connecting to {cluster_uri}...")
        credential = DefaultAzureCredential()
        kcsb = KustoConnectionStringBuilder.with_azure_token_credential(cluster_uri, credential)
        client = KustoClient(kcsb)

        print("⏳ Executing query (this may take a few minutes)...")
        response = client.execute_query("ACE", query)

        results = []
        columns = [col.column_name for col in response.primary_results[0].columns]

        for row in response.primary_results[0].rows:
            row_dict = dict(zip(columns, row))
            results.append(row_dict)

        print(f"✅ Retrieved {len(results):,} records")
        return results

    except ImportError:
        print("⚠️  Azure Kusto SDK not installed. Run: pip install azure-kusto-data azure-identity")
        return None
    except Exception as e:
        print(f"❌ Kusto Error: {e}")
        return None


def save_to_csv(records: list, output_file: str):
    """Save records to CSV file."""
    if not records:
        print("⚠️  No records to save")
        return False

    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # Normalize exam names and format data
    for record in records:
        record["exam_name"] = normalize_exam_name(record.get("exam_name", ""))
        # Format dates
        if record.get("exam_date"):
            try:
                dt = record["exam_date"]
                if hasattr(dt, "isoformat"):
                    record["exam_date"] = dt.isoformat()
                else:
                    record["exam_date"] = str(dt)
            except:
                pass
        # Handle score - convert to percentage if valid
        score = record.get("score_percent")
        if score is not None and score > 0:
            record["score_percent"] = round(float(score), 1)
        else:
            record["score_percent"] = ""

    fieldnames = ["email", "dotcom_id", "exam_code", "exam_name", "exam_date", "exam_status", "score_percent", "source"]

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"💾 Saved {len(records):,} records to {output_file}")
    return True


def main():
    print("=" * 60)
    print("📊 Syncing Individual Exam Records")
    print("=" * 60)
    print()

    # Try to connect to Kusto
    cluster = "https://cse-analytics.centralus.kusto.windows.net"
    records = run_kusto_query(INDIVIDUAL_EXAMS_QUERY, cluster)

    if records:
        save_to_csv(records, OUTPUT_FILE)

        # Print summary by status
        status_counts = {}
        for r in records:
            status = r.get("exam_status", "Unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        unique_emails = len(set(r.get("email", "") for r in records))
        with_scores = sum(1 for r in records if r.get("score_percent") and r.get("score_percent") > 0)

        print()
        print("📈 Summary:")
        print(f"   Total exam records: {len(records):,}")
        print(f"   Unique learners: {unique_emails:,}")
        print(f"   Records with scores: {with_scores:,}")
        print()
        print("   By Status:")
        for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
            pct = count / len(records) * 100
            print(f"      {status}: {count:,} ({pct:.1f}%)")
    else:
        print()
        print("⚠️  Could not fetch data from Kusto.")
        print("   Make sure you're authenticated (az login) and have access to the clusters.")

    print()
    print("✨ Done!")


if __name__ == "__main__":
    main()
