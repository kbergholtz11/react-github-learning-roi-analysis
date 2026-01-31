#!/usr/bin/env python3
"""Analyze data quality breakdown to identify improvement opportunities"""
import duckdb
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
parquet_path = os.path.join(project_root, 'data', 'learners_enriched.parquet')

conn = duckdb.connect()

print("=== Data Quality Score Components Analysis ===\n")

# Check each component that contributes to data quality score
result = conn.execute(f"""
SELECT 
    COUNT(*) as total,
    -- Core identity (40 points)
    SUM(CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END) as has_email,
    SUM(CASE WHEN userhandle IS NOT NULL AND userhandle != '' THEN 1 ELSE 0 END) as has_userhandle,
    SUM(CASE WHEN dotcom_id IS NOT NULL AND dotcom_id > 0 THEN 1 ELSE 0 END) as has_dotcom_id,
    SUM(CASE WHEN country IS NOT NULL AND country != '' THEN 1 ELSE 0 END) as has_country,
    -- Company attribution (25 points)
    SUM(CASE WHEN company_name IS NOT NULL AND company_name != '' THEN 1 ELSE 0 END) as has_company,
    SUM(CASE WHEN company_source IN ('billing_customer', 'salesforce_account') THEN 1 ELSE 0 END) as has_verified_company,
    -- Learning activity (20 points) - now includes exam attempts
    SUM(CASE WHEN exams_passed > 0 THEN 1 ELSE 0 END) as has_certification,
    SUM(CASE WHEN COALESCE(total_exams, 0) > 0 THEN 1 ELSE 0 END) as has_exam_attempts,
    SUM(CASE WHEN COALESCE(skills_page_views_x, skills_page_views_y, 0) > 0 THEN 1 ELSE 0 END) as has_skills_activity,
    SUM(CASE WHEN COALESCE(learn_page_views, 0) > 0 THEN 1 ELSE 0 END) as has_learn_activity,
    SUM(CASE WHEN partner_certs > 0 THEN 1 ELSE 0 END) as has_partner_certs,
    -- Product usage (15 points)
    SUM(CASE WHEN copilot_days > 0 THEN 1 ELSE 0 END) as has_copilot,
    SUM(CASE WHEN actions_days > 0 THEN 1 ELSE 0 END) as has_actions,
    SUM(CASE WHEN total_active_days > 0 THEN 1 ELSE 0 END) as has_product_usage
FROM read_parquet('{parquet_path}')
""").fetchone()

total = result[0]
metrics = [
    ("Email (10 pts)", result[1], 10),
    ("Userhandle (10 pts)", result[2], 10),
    ("Dotcom ID (10 pts)", result[3], 10),
    ("Country (10 pts)", result[4], 10),
    ("Company name (15 pts)", result[5], 15),
    ("Verified company (10 pts)", result[6], 10),
    ("Certification (3 pts)", result[7], 3),
    ("Exam attempts (2 pts)", result[8], 2),
    ("Skills activity (5 pts)", result[9], 5),
    ("Learn activity (5 pts)", result[10], 5),
    ("Partner certs (5 pts)", result[11], 5),
    ("Copilot usage (5 pts)", result[12], 5),
    ("Actions usage (5 pts)", result[13], 5),
    ("Product usage (5 pts)", result[14], 5),
]

print(f"Total learners: {total:,}\n")
print(f"{'Component':<30} {'Has Data':>12} {'Missing':>12} {'% Complete':>12} {'Max Pts':>10}")
print("-" * 80)

total_possible = 0
total_achieved = 0
gaps = []

for name, count, points in metrics:
    pct = (count / total) * 100
    missing = total - count
    print(f"{name:<30} {count:>12,} {missing:>12,} {pct:>11.1f}% {points:>10}")
    
    total_possible += points
    achieved = (count / total) * points
    total_achieved += achieved
    
    if pct < 50:
        gaps.append((name, pct, missing, points))

print("-" * 80)
print(f"{'Theoretical max score:':<30} {total_possible:>47}")
print(f"{'Average achieved:':<30} {total_achieved:>47.1f}")

print("\n=== BIGGEST GAPS (< 50% complete) ===\n")
gaps.sort(key=lambda x: x[1])
for name, pct, missing, points in gaps:
    print(f"  ⚠️  {name}: only {pct:.1f}% complete ({missing:,} missing)")

print("\n=== Data Quality Level Distribution ===\n")
result = conn.execute(f"""
SELECT 
    data_quality_level,
    COUNT(*) as cnt,
    ROUND(AVG(data_quality_score), 1) as avg_score
FROM read_parquet('{parquet_path}')
GROUP BY data_quality_level
ORDER BY avg_score DESC
""").fetchall()
for row in result:
    print(f"  {row[0]}: {row[1]:,} learners (avg score: {row[2]})")

print("\n=== Low Quality Learners - What's Missing? ===\n")
result = conn.execute(f"""
SELECT 
    SUM(CASE WHEN company_name IS NULL OR company_name = '' THEN 1 ELSE 0 END) as no_company,
    SUM(CASE WHEN dotcom_id IS NULL OR dotcom_id = 0 THEN 1 ELSE 0 END) as no_dotcom_id,
    SUM(CASE WHEN exams_passed = 0 OR exams_passed IS NULL THEN 1 ELSE 0 END) as no_cert,
    SUM(CASE WHEN COALESCE(total_exams, 0) = 0 THEN 1 ELSE 0 END) as no_exam_attempts,
    SUM(CASE WHEN copilot_days = 0 OR copilot_days IS NULL THEN 1 ELSE 0 END) as no_copilot,
    SUM(CASE WHEN COALESCE(skills_page_views_x, skills_page_views_y, 0) = 0 THEN 1 ELSE 0 END) as no_skills,
    SUM(CASE WHEN COALESCE(learn_page_views, 0) = 0 THEN 1 ELSE 0 END) as no_learn
FROM read_parquet('{parquet_path}')
WHERE data_quality_level = 'low'
""").fetchone()
print(f"  Low-quality learners breakdown:")
print(f"    - No company: {result[0]:,}")
print(f"    - No dotcom_id: {result[1]:,}")
print(f"    - No certification (passed): {result[2]:,}")
print(f"    - No exam attempts: {result[3]:,}")
print(f"    - No Copilot usage (365d): {result[4]:,}")
print(f"    - No Skills activity: {result[5]:,}")
print(f"    - No Learn activity: {result[6]:,}")

# === NEW: Certification Attempt Analytics ===
print("\n=== Certification Attempt Analytics ===\n")
try:
    cert_result = conn.execute(f"""
    SELECT 
        COUNT(*) as total_learners,
        SUM(CASE WHEN exams_passed > 0 THEN 1 ELSE 0 END) as has_passed,
        SUM(CASE WHEN COALESCE(total_exams, 0) > 0 THEN 1 ELSE 0 END) as has_attempts,
        SUM(CASE WHEN COALESCE(total_exams, 0) > exams_passed THEN 1 ELSE 0 END) as has_failed_attempts,
        SUM(exams_passed) as total_passes,
        SUM(COALESCE(total_exams, 0)) as total_attempts
    FROM read_parquet('{parquet_path}')
    """).fetchone()
    
    total_learners = cert_result[0]
    has_passed = cert_result[1]
    has_attempts = cert_result[2]
    has_failed = cert_result[3]
    total_passes = cert_result[4]
    total_attempts = cert_result[5]
    
    print(f"  Total learners: {total_learners:,}")
    print(f"  Learners with certifications: {has_passed:,} ({has_passed/total_learners*100:.1f}%)")
    print(f"  Learners with exam attempts: {has_attempts:,} ({has_attempts/total_learners*100:.1f}%)")
    print(f"  Learners who failed at least once: {has_failed:,}")
    print(f"")
    print(f"  Total exam attempts: {total_attempts:,}")
    print(f"  Total exams passed: {total_passes:,}")
    if total_attempts > 0:
        pass_rate = total_passes / total_attempts * 100
        print(f"  Overall pass rate: {pass_rate:.1f}%")
        print(f"")
        print(f"  💡 The 'certification gap' of {100-has_passed/total_learners*100:.1f}% includes:")
        print(f"     - {has_attempts - has_passed:,} learners actively trying (attempted but not yet passed)")
        print(f"     - {total_learners - has_attempts:,} learners who haven't attempted yet")
except Exception as e:
    print(f"  ⚠️ Could not analyze certification attempts: {e}")

print("\n=== Product Usage Analysis ===\n")
try:
    product_result = conn.execute(f"""
    SELECT 
        SUM(CASE WHEN copilot_days > 0 THEN 1 ELSE 0 END) as copilot_users,
        SUM(copilot_days) as total_copilot_days,
        SUM(CASE WHEN actions_days > 0 THEN 1 ELSE 0 END) as actions_users,
        SUM(actions_days) as total_actions_days,
        SUM(CASE WHEN total_active_days > 0 THEN 1 ELSE 0 END) as any_product_users,
        SUM(total_active_days) as total_active_days_sum
    FROM read_parquet('{parquet_path}')
    """).fetchone()
    
    print(f"  GitHub Copilot: {product_result[0]:,} users ({product_result[1]:,} total days)")
    print(f"  Actions: {product_result[2]:,} users ({product_result[3]:,} total days)")
    print(f"  Any Product: {product_result[4]:,} users ({product_result[5]:,} total active days)")
    
except Exception as e:
    print(f"  ⚠️ Could not analyze product usage: {e}")
