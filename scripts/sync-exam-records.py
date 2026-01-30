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
# Includes ALL exam statuses with comprehensive FY22-FY25 data
INDIVIDUAL_EXAMS_QUERY = """
// ============================================================================
// FY22-FY25: Comprehensive exam records from gh-analytics.ace
// ============================================================================

// 0. Deduplicate eligibility_sent to the latest record per eligibility_id
let EligibilityData = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_eligibility_sent
    | extend eligibility_id      = tostring(existing_eligibility_id)
    | summarize arg_max(kafka_timestamp, *) by eligibility_id
    | project
        eligibility_id,
        user_handle_meta = coalesce(user.handle, ""),
        exam_name_meta   = coalesce(exam.name, ""),
        exam_code_meta   = coalesce(exam.code, ""),
        RegisteredDate   = todatetime(start_date);

// 1. Build each exam-event stream including event-level handle & exam fields
let ScheduledExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_scheduled
    | project
        eligibility_id    = tostring(eligibility_id),
        ExamDate          = todatetime(scheduled_for),
        Status            = "Scheduled",
        exam_timestamp    = timestamp,
        user_handle_event = coalesce(user.handle, ""),
        examname_event    = coalesce(exam.name, ""),
        examcode_event    = coalesce(exam.code, ""),
        userhandle_ex     = "",
        examname_ex       = "",
        examcode_ex       = "",
        correct           = int(null),
        incorrect         = int(null),
        RoundedScore      = real(null),
        ScorePercentage   = "",
        region            = "";

let RescheduledExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_rescheduled
    | project
        eligibility_id    = tostring(eligibility_id),
        ExamDate          = todatetime(rescheduled_for),
        Status            = "Rescheduled",
        exam_timestamp    = timestamp,
        user_handle_event = coalesce(user.handle, ""),
        examname_event    = coalesce(exam.name, ""),
        examcode_event    = coalesce(exam.code, ""),
        userhandle_ex     = "",
        examname_ex       = "",
        examcode_ex       = "",
        correct           = int(null),
        incorrect         = int(null),
        RoundedScore      = real(null),
        ScorePercentage   = "",
        region            = "";

let CancelledExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_cancelled
    | project
        eligibility_id    = tostring(eligibility_id),
        ExamDate          = todatetime(cancelled_on),
        Status            = "Cancelled",
        exam_timestamp    = timestamp,
        user_handle_event = coalesce(user.handle, ""),
        examname_event    = coalesce(exam.name, ""),
        examcode_event    = coalesce(exam.code, ""),
        userhandle_ex     = "",
        examname_ex       = "",
        examcode_ex       = "",
        correct           = int(null),
        incorrect         = int(null),
        RoundedScore      = real(null),
        ScorePercentage   = "",
        region            = "";

let AbsentExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_absent
    | project
        eligibility_id    = tostring(eligibility_id),
        ExamDate          = todatetime(absent_on),
        Status            = "Absent",
        exam_timestamp    = timestamp,
        user_handle_event = coalesce(user.handle, ""),
        examname_event    = coalesce(exam.name, ""),
        examcode_event    = coalesce(exam.code, ""),
        userhandle_ex     = "",
        examname_ex       = "",
        examcode_ex       = "",
        correct           = int(null),
        incorrect         = int(null),
        RoundedScore      = real(null),
        ScorePercentage   = "",
        region            = "";

// 2. CompletedExams with result-level fields
let CompletedExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | extend RoundedScore    = iif(correct+incorrect > 0,
                                    round((todouble(correct)/(correct+incorrect))*100,2),
                                    real(null))
    | extend ScorePercentage = strcat(RoundedScore, "%")
    | project
        eligibility_id    = tostring(eligibilityid),
        ExamDate          = todatetime(endtime),
        Status            = iff(passed, "Passed", "Failed"),
        correct,
        incorrect,
        RoundedScore,
        ScorePercentage,
        exam_timestamp    = updateddate,
        region,
        userhandle_ex     = coalesce(userhandle, ""),
        examname_ex       = coalesce(examname, ""),
        examcode_ex       = coalesce(examcode, ""),
        user_handle_event = "",
        examname_event    = "",
        examcode_event    = "";

// 3. RegisteredExams from eligibility_sent
let RegisteredExams = EligibilityData
    | project
        eligibility_id    = eligibility_id,
        ExamDate          = RegisteredDate,
        Status            = "Registered",
        exam_timestamp    = RegisteredDate,
        user_handle_event = "",
        examname_event    = "",
        examcode_event    = "",
        userhandle_ex     = "",
        examname_ex       = "",
        examcode_ex       = "",
        correct           = int(null),
        incorrect         = int(null),
        RoundedScore      = real(null),
        ScorePercentage   = "",
        region            = "";

// 4. Union and add formatted date
let CombinedExams = union
        ScheduledExams,
        RescheduledExams,
        CancelledExams,
        AbsentExams,
        CompletedExams,
        RegisteredExams
    | extend FormattedDate = format_datetime(ExamDate, "yyyy-MM-dd");

// 5. LEFT OUTER join to EligibilityData and compute unified fields
let CombinedWithMeta = CombinedExams
    | join kind=leftouter EligibilityData on eligibility_id
    | extend
        handle     = coalesce(user_handle_meta, user_handle_event, userhandle_ex),
        exam_name  = coalesce(exam_name_meta, examname_event, examname_ex),
        exam_code  = coalesce(exam_code_meta, examcode_event, examcode_ex),
        raw_status = Status,
        exam_status= iif(Status=="Registered" and ExamDate < ago(60d), "Expired Registration", Status);

// 6. Rank and select one record per eligibility_id
let Ranked = CombinedWithMeta
    | extend status_rank = case(
          exam_status=="Passed",              1,
          exam_status=="Failed",              2,
          exam_status=="Absent",              3,
          exam_status=="Rescheduled",         4,
          exam_status=="Scheduled",           5,
          exam_status=="Cancelled",           7,
          exam_status=="Registered",          8,
          exam_status=="Expired Registration",9,
          10
      );

let PassedRecords = Ranked
    | where exam_status=="Passed"
    | summarize arg_max(exam_timestamp, *) by eligibility_id;

let NonPassed = Ranked
    | where eligibility_id !in (PassedRecords | project eligibility_id);

let MinRankByElig = NonPassed | summarize min_rank = min(status_rank) by eligibility_id;

let OtherRecords = NonPassed
    | join kind=inner MinRankByElig on eligibility_id
    | where status_rank == min_rank
    | summarize arg_max(exam_timestamp, *) by eligibility_id;

let FY22_25 = union PassedRecords, OtherRecords
    | where handle != ""
        and not (isempty(eligibility_id) and exam_status != "No Exam")
        and not (exam_status in ("Scheduled","Rescheduled") and ExamDate < now())
        and exam_name !in ("GHAS 2024 Beta","UGWG")
    | extend source = "FY22-25"
    | project
        handle,
        exam_code,
        exam_name,
        exam_date = ExamDate,
        exam_status,
        score_percent = RoundedScore,
        source;

// ============================================================================
// FY26: cse-analytics.ACE.pearson_exam_results (ALL statuses with scores)
// ============================================================================
let FY26 = cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
    | extend 
        handle = tolower(['Candidate Email']),
        exam_code = ['Exam Series Code'],
        exam_name = ['Exam Title'],
        exam_date = Date,
        exam_status = case(
            ['Total Passed'] > 0, "Passed",
            ['Total Failed'] > 0, "Failed",
            ['Registration Status'] == "No Show", "No Show",
            ['Registration Status'] == "Scheduled", "Scheduled",
            ['Registration Status'] == "Canceled", "Canceled",
            ['Registration Status']
        ),
        score_percent = todouble(Score),
        source = "FY26"
    | project handle, exam_code, exam_name, exam_date, exam_status, score_percent, source;

// ============================================================================
// Get email-to-dotcom mapping for joining
// ============================================================================
let email_mapping = cluster('gh-analytics.eastus.kusto.windows.net').database('snapshots').github_mysql1_user_emails_current
    | where state == "verified"
    | extend email = tolower(deobfuscated_email), dotcom_id = tolong(user_id)
    | where isnotempty(email) and dotcom_id > 0
    | summarize dotcom_id = max(dotcom_id) by email;

// Union all exam records and join with email mapping
union FY22_25, FY26
| extend email = handle
| join kind=leftouter email_mapping on email
| project
    email,
    dotcom_id = coalesce(dotcom_id, tolong(0)),
    exam_code,
    exam_name,
    exam_date,
    exam_status,
    score_percent,
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
