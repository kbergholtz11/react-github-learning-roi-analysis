#!/usr/bin/env python3
"""Analyze why certified users have no skills data overlap."""

import duckdb

conn = duckdb.connect(':memory:')
conn.execute("CREATE VIEW learners AS SELECT * FROM read_parquet('data/learners_enriched.parquet')")

# Check if certified users have dotcom_ids
cert_with_id = conn.execute('''
    SELECT count(*) FROM learners 
    WHERE exams_passed > 0 AND dotcom_id IS NOT NULL AND dotcom_id > 0
''').fetchone()[0]
print(f'Certified users with dotcom_id: {cert_with_id:,}')

# Check if skills users have dotcom_ids
skills_with_id = conn.execute('''
    SELECT count(*) FROM learners 
    WHERE skills_page_views > 0 AND dotcom_id IS NOT NULL AND dotcom_id > 0
''').fetchone()[0]
print(f'Skills users with dotcom_id: {skills_with_id:,}')

# Get sample of certified user
print('\nSample certified users:')
cert_sample = conn.execute('''
    SELECT email, dotcom_id, exams_passed, skills_page_views 
    FROM learners WHERE exams_passed > 0 LIMIT 3
''').fetchdf()
print(cert_sample.to_string())

# Get sample of skills user
print('\nSample skills users:')
skills_sample = conn.execute('''
    SELECT email, dotcom_id, exams_passed, skills_page_views 
    FROM learners WHERE skills_page_views > 0 LIMIT 3
''').fetchdf()
print(skills_sample.to_string())

# Check if any certified user's dotcom_id appears in skills users
print('\n=== INVESTIGATING JOIN ISSUE ===')
overlap = conn.execute('''
    WITH certified AS (
        SELECT DISTINCT dotcom_id FROM learners 
        WHERE exams_passed > 0 AND dotcom_id > 0
    ),
    skills AS (
        SELECT DISTINCT dotcom_id FROM learners 
        WHERE skills_page_views > 0 AND dotcom_id > 0
    )
    SELECT count(*) as overlap_count
    FROM certified c
    INNER JOIN skills s ON c.dotcom_id = s.dotcom_id
''').fetchone()[0]
print(f'Overlap of dotcom_ids between certified and skills: {overlap:,}')

# Check unique dotcom_ids in each group
cert_ids = conn.execute('''
    SELECT count(DISTINCT dotcom_id) FROM learners 
    WHERE exams_passed > 0 AND dotcom_id > 0
''').fetchone()[0]
skills_ids = conn.execute('''
    SELECT count(DISTINCT dotcom_id) FROM learners 
    WHERE skills_page_views > 0 AND dotcom_id > 0
''').fetchone()[0]
print(f'Unique dotcom_ids in certified: {cert_ids:,}')
print(f'Unique dotcom_ids in skills: {skills_ids:,}')
