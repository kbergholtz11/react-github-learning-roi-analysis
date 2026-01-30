#!/usr/bin/env python3
"""
Sync Individual Exam Records

Pulls individual exam records from both FY22-25 and FY26 data sources
to enable per-certification date and score tracking.

Run: python scripts/sync-exam-records.py
"""

import csv
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

OUTPUT_FILE = "data/individual_exams.csv"

# Query to get all individual exam records with unified schema
INDIVIDUAL_EXAMS_QUERY = """
// Get email-to-dotcom mapping
let email_mapping = cluster('gh-analytics.eastus.kusto.windows.net').database('snapshots').github_mysql1_user_emails_current
    | where state == "verified"
    | extend email = tolower(deobfuscated_email), dotcom_id = tolong(user_id)
    | where isnotempty(email) and dotcom_id > 0
    | summarize dotcom_id = max(dotcom_id) by email;

// FY22-25: gh-analytics.ace.exam_results (all attempts)
let FY22_25 = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | extend 
        email = tolower(email),
        exam_code = examcode,
        exam_name = examname,
        exam_date = endtime,
        passed = passed,
        source = "FY22-25"
    | project email, exam_code, exam_name, exam_date, passed, source;

// FY26: cse-analytics.ACE.pearson_exam_results
let FY26 = cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
    | extend 
        email = tolower(['Candidate Email']),
        exam_code = ['Exam Series Code'],
        exam_name = ['Exam Title'],
        exam_date = Date,
        passed = iff(['Total Passed'] > 0, true, false),
        source = "FY26"
    | project email, exam_code, exam_name, exam_date, passed, source;

// Union all exam records
union FY22_25, FY26
| join kind=leftouter email_mapping on email
| project
    email,
    dotcom_id = coalesce(dotcom_id, tolong(0)),
    exam_code,
    exam_name,
    exam_date,
    passed,
    source
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

    # Normalize exam names
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

    fieldnames = ["email", "dotcom_id", "exam_code", "exam_name", "exam_date", "passed", "source"]

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

        # Print summary
        passed_count = sum(1 for r in records if r.get("passed"))
        unique_emails = len(set(r.get("email", "") for r in records))

        print()
        print("📈 Summary:")
        print(f"   Total exam records: {len(records):,}")
        print(f"   Passed exams: {passed_count:,}")
        print(f"   Unique learners: {unique_emails:,}")
        print(f"   Pass rate: {passed_count / len(records) * 100:.1f}%")
    else:
        print()
        print("⚠️  Could not fetch data from Kusto.")
        print("   Make sure you're authenticated (az login) and have access to the clusters.")

    print()
    print("✨ Done!")


if __name__ == "__main__":
    main()
