#!/usr/bin/env python3
"""Check date ranges in the current data."""

import duckdb

conn = duckdb.connect(':memory:')
conn.execute("CREATE VIEW learners AS SELECT * FROM read_parquet('data/learners_enriched.parquet')")

# Check skills date range
skills_dates = conn.execute('''
    SELECT 
        min(first_skills_visit) as earliest,
        max(last_skills_visit) as latest,
        count(*) as total_with_skills
    FROM learners WHERE skills_page_views > 0
''').fetchdf()
print('Current Skills Data in Parquet:')
print(f"  Earliest: {skills_dates.iloc[0]['earliest']}")
print(f"  Latest: {skills_dates.iloc[0]['latest']}")
print(f"  Users with skills: {skills_dates.iloc[0]['total_with_skills']:,}")

# Check learn date range
learn_dates = conn.execute('''
    SELECT 
        min(first_learn_visit) as earliest,
        max(last_learn_visit) as latest,
        count(*) as total_with_learn
    FROM learners WHERE learn_page_views > 0
''').fetchdf()
print('\nCurrent Learn Data in Parquet:')
print(f"  Earliest: {learn_dates.iloc[0]['earliest']}")
print(f"  Latest: {learn_dates.iloc[0]['latest']}")
print(f"  Users with learn: {learn_dates.iloc[0]['total_with_learn']:,}")

# Check exam date range for comparison
exam_dates = conn.execute('''
    SELECT 
        min(first_exam) as earliest,
        max(last_exam) as latest,
        count(*) as total_certified
    FROM learners WHERE exams_passed > 0
''').fetchdf()
print('\nExam Data Range (for comparison):')
print(f"  Earliest: {exam_dates.iloc[0]['earliest']}")
print(f"  Latest: {exam_dates.iloc[0]['latest']}")
print(f"  Certified users: {exam_dates.iloc[0]['total_certified']:,}")
