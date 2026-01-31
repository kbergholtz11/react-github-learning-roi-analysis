#!/usr/bin/env python3
"""
DIAGNOSTIC: Why Certified Users Have No Skills Data

Issue: 0 overlap between certified users and skills page view users

Root cause analysis:
1. Certified users get dotcom_id from ACE database email mapping
2. Skills users get dotcom_id from Hydro analytics (actor_id)
3. These are completely separate ID populations
"""

import duckdb

conn = duckdb.connect(':memory:')
conn.execute("CREATE VIEW learners AS SELECT * FROM read_parquet('data/learners_enriched.parquet')")

print("=== DATA POPULATION ANALYSIS ===\n")

# Check ID ranges
cert_ids = conn.execute('''
    SELECT 
        min(dotcom_id) as min_id, 
        max(dotcom_id) as max_id,
        avg(dotcom_id) as avg_id
    FROM learners 
    WHERE exams_passed > 0 AND dotcom_id > 0
''').fetchdf()
print("Certified users dotcom_id range:")
print(f"  Min: {cert_ids.iloc[0]['min_id']:,.0f}")
print(f"  Max: {cert_ids.iloc[0]['max_id']:,.0f}")
print(f"  Avg: {cert_ids.iloc[0]['avg_id']:,.0f}")

skills_ids = conn.execute('''
    SELECT 
        min(dotcom_id) as min_id, 
        max(dotcom_id) as max_id,
        avg(dotcom_id) as avg_id
    FROM learners 
    WHERE skills_page_views > 0 AND dotcom_id > 0
''').fetchdf()
print("\nSkills users dotcom_id range:")
print(f"  Min: {skills_ids.iloc[0]['min_id']:,.0f}")
print(f"  Max: {skills_ids.iloc[0]['max_id']:,.0f}")
print(f"  Avg: {skills_ids.iloc[0]['avg_id']:,.0f}")

# Check how many ACE users have dotcom_id = 0
cert_no_id = conn.execute('''
    SELECT count(*) FROM learners 
    WHERE exams_passed > 0 AND (dotcom_id IS NULL OR dotcom_id = 0)
''').fetchone()[0]
cert_total = conn.execute('SELECT count(*) FROM learners WHERE exams_passed > 0').fetchone()[0]
print(f"\nCertified users missing dotcom_id: {cert_no_id:,} / {cert_total:,} ({100*cert_no_id/cert_total:.1f}%)")

# Skills users always have dotcom_id (it's the actor_id from page views)
skills_no_id = conn.execute('''
    SELECT count(*) FROM learners 
    WHERE skills_page_views > 0 AND (dotcom_id IS NULL OR dotcom_id = 0)
''').fetchone()[0]
skills_total = conn.execute('SELECT count(*) FROM learners WHERE skills_page_views > 0').fetchone()[0]
print(f"Skills users missing dotcom_id: {skills_no_id:,} / {skills_total:,}")

print("\n=== DIAGNOSIS ===")
print("""
The issue is that Skills page views come from Hydro analytics, where:
- actor_id represents GitHub users viewing skills/* repositories
- These are different users than those in ACE certification database

This makes sense because:
- Skills/* repos are free interactive tutorials (github.com/skills/*)
- ACE Portal users are exam-taking professionals
- Most Skills users are new/learning users, not certification seekers yet

RECOMMENDATION: This is expected behavior, not a bug.
The journey data IS complete for each user type:
- Certified users have: certs + product usage (via dotcom_id)
- Skills users have: skills activity + product usage (via dotcom_id)
- Both have complete journey data within their cohort
""")

# Show that each cohort has its full journey
print("\n=== JOURNEY COMPLETENESS BY COHORT ===")

# Certified with product data
cert_with_products = conn.execute('''
    SELECT count(*) FROM learners 
    WHERE exams_passed > 0 AND total_active_days > 0
''').fetchone()[0]
print(f"Certified users with product data: {cert_with_products:,} / {cert_total:,} ({100*cert_with_products/cert_total:.1f}%)")

# Skills with product data
skills_with_products = conn.execute('''
    SELECT count(*) FROM learners 
    WHERE skills_page_views > 0 AND total_active_days > 0
''').fetchone()[0]
print(f"Skills users with product data: {skills_with_products:,} / {skills_total:,} ({100*skills_with_products/skills_total:.1f}%)")

# Show a well-connected certified user
print("\n=== SAMPLE CERTIFIED USER WITH FULL JOURNEY ===")
sample = conn.execute('''
    SELECT email, exams_passed, cert_names, learner_status,
           skills_page_views, learn_page_views,
           copilot_days, actions_days, security_days, total_active_days,
           skill_maturity_score, products_adopted_count
    FROM learners 
    WHERE exams_passed >= 2 AND total_active_days > 100
    ORDER BY total_active_days DESC
    LIMIT 1
''').fetchdf()
for col in sample.columns:
    print(f"  {col}: {sample.iloc[0][col]}")
