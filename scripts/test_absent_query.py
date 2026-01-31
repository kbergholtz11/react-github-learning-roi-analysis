#!/usr/bin/env python3
"""Test the updated individual exams query with FY22-25 absents."""

from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder

credential = DefaultAzureCredential()

# CSE Analytics cluster (FY26 data and cross-cluster access)
cse_kcsb = KustoConnectionStringBuilder.with_azure_token_credential(
    'https://cse-analytics.centralus.kusto.windows.net', credential)
cse_client = KustoClient(cse_kcsb)

# Test query - just count absents from FY22-25
test_query = """
// Check FY22-25 absent count
let AbsentExams = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').ace_v0_exam_absent
    | summarize count();
AbsentExams
"""

print("Testing FY22-25 absent count from hydro.ace_v0_exam_absent...")
try:
    result = cse_client.execute_query("ACE", test_query)
    for row in result.primary_results[0]:
        print(f"FY22-25 Absent count: {row[0]:,}")
except Exception as e:
    print(f"Error: {e}")

# Test status breakdown
test_query2 = """
// Get status breakdown from event tables
let Absents = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').ace_v0_exam_absent
    | summarize absent_count = count();
let Scheduled = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').ace_v0_exam_scheduled
    | summarize scheduled_count = count();
let Cancelled = cluster('gh-analytics.eastus.kusto.windows.net').database('hydro').ace_v0_exam_cancelled
    | summarize cancelled_count = count();
let Completed = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
    | summarize 
        passed_count = countif(passed == true),
        failed_count = countif(passed == false);
Absents
| extend scheduled_count = toscalar(Scheduled),
         cancelled_count = toscalar(Cancelled),
         passed_count = toscalar(Completed | project passed_count),
         failed_count = toscalar(Completed | project failed_count)
"""

print("\nGetting FY22-25 event table counts...")
try:
    result = cse_client.execute_query("ACE", test_query2)
    for row in result.primary_results[0]:
        print(f"Absents: {row[0]:,}")
        print(f"Scheduled: {row[1]:,}")
        print(f"Cancelled: {row[2]:,}")
        print(f"Passed: {row[3]:,}")
        print(f"Failed: {row[4]:,}")
except Exception as e:
    print(f"Error: {e}")
