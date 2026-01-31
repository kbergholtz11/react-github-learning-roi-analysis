#!/usr/bin/env python3
"""Check learner journey data completeness using DuckDB (fast)."""

import duckdb

conn = duckdb.connect(':memory:')
conn.execute("CREATE VIEW learners AS SELECT * FROM read_parquet('data/learners_enriched.parquet')")

# Total learners
total = conn.execute('SELECT count(*) FROM learners').fetchone()[0]
print(f'Total learners: {total:,}')

# Certified
certified = conn.execute('SELECT count(*) FROM learners WHERE exams_passed > 0').fetchone()[0]
print(f'Certified: {certified:,}')

# With skills activity
skills = conn.execute('SELECT count(*) FROM learners WHERE skills_page_views > 0').fetchone()[0]
print(f'Skills users: {skills:,}')

# With learn activity
learn = conn.execute('SELECT count(*) FROM learners WHERE learn_page_views > 0').fetchone()[0]
print(f'Learn users: {learn:,}')

# With product usage
products = conn.execute('SELECT count(*) FROM learners WHERE total_active_days > 0').fetchone()[0]
print(f'Product users: {products:,}')

print()
print('=== JOURNEY OVERLAPS ===')

# Certified AND skills
cert_skills = conn.execute('SELECT count(*) FROM learners WHERE exams_passed > 0 AND skills_page_views > 0').fetchone()[0]
print(f'Certified + Skills: {cert_skills:,}')

# Certified AND learn
cert_learn = conn.execute('SELECT count(*) FROM learners WHERE exams_passed > 0 AND learn_page_views > 0').fetchone()[0]
print(f'Certified + Learn: {cert_learn:,}')

# Certified AND products
cert_prod = conn.execute('SELECT count(*) FROM learners WHERE exams_passed > 0 AND total_active_days > 10').fetchone()[0]
print(f'Certified + Products (10+ days): {cert_prod:,}')

# ALL THREE
all_three = conn.execute('SELECT count(*) FROM learners WHERE exams_passed > 0 AND skills_page_views > 0 AND total_active_days > 10').fetchone()[0]
print(f'Certified + Skills + Products: {all_three:,}')

# Sample a complete journey user
print()
print('=== SAMPLE COMPLETE JOURNEY USER ===')
sample = conn.execute('''
    SELECT email, exams_passed, cert_names, learner_status,
           skills_page_views, skills_count, learn_page_views,
           copilot_days, actions_days, total_active_days, 
           skill_maturity_score, skill_maturity_level
    FROM learners 
    WHERE exams_passed > 0 AND skills_page_views > 0 AND total_active_days > 10
    LIMIT 1
''').fetchdf()

if len(sample) > 0:
    for col in sample.columns:
        print(f'  {col}: {sample.iloc[0][col]}')
else:
    print('No users found with all three journey components')
    # Find best alternative
    alt = conn.execute('''
        SELECT email, exams_passed, skills_page_views, learn_page_views, 
               copilot_days, actions_days, total_active_days
        FROM learners 
        WHERE exams_passed > 0 AND total_active_days > 50
        ORDER BY total_active_days DESC
        LIMIT 1
    ''').fetchdf()
    if len(alt) > 0:
        print('Alternative (Certified + Heavy Product Use):')
        for col in alt.columns:
            print(f'  {col}: {alt.iloc[0][col]}')
