#!/usr/bin/env python3
"""Check overlap between skills and certs users"""
import duckdb

conn = duckdb.connect()
conn.execute("CREATE TABLE learners_enriched AS SELECT * FROM 'data/learners_enriched.parquet'")

print("=== Users with Certs (sample) ===")
result = conn.execute("""
SELECT dotcom_id, exams_passed, skills_count
FROM learners_enriched
WHERE COALESCE(exams_passed, 0) > 0
LIMIT 5
""").fetchall()
for row in result:
    print(f"  dotcom_id={row[0]}, exams_passed={row[1]}, skills_count={row[2]}")

print()
print("=== Users with Skills (sample) ===")
result = conn.execute("""
SELECT dotcom_id, exams_passed, skills_count
FROM learners_enriched
WHERE COALESCE(skills_count, 0) > 0
LIMIT 5
""").fetchall()
for row in result:
    print(f"  dotcom_id={row[0]}, exams_passed={row[1]}, skills_count={row[2]}")

print()
print("=== Overlap check ===")
result = conn.execute("""
SELECT 
    SUM(CASE WHEN COALESCE(exams_passed, 0) > 0 THEN 1 ELSE 0 END) as has_certs,
    SUM(CASE WHEN COALESCE(skills_count, 0) > 0 THEN 1 ELSE 0 END) as has_skills,
    SUM(CASE WHEN COALESCE(exams_passed, 0) > 0 AND COALESCE(skills_count, 0) > 0 THEN 1 ELSE 0 END) as has_both
FROM learners_enriched
""").fetchone()
print(f"  Has Certs: {result[0]:,}")
print(f"  Has Skills: {result[1]:,}")
print(f"  Has Both: {result[2]:,}")
