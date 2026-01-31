#!/usr/bin/env python3
import duckdb
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
parquet_path = os.path.join(project_root, 'data', 'learners_enriched.parquet')

conn = duckdb.connect()

# Check what org_msft_tpid_name looks like
print('=== Sample org_msft_tpid_name values ===')
result = conn.execute(f"""
SELECT org_msft_tpid_name, company_name, company_source, COUNT(*) as cnt
FROM read_parquet('{parquet_path}')
WHERE org_msft_tpid_name IS NOT NULL AND org_msft_tpid_name != ''
GROUP BY org_msft_tpid_name, company_name, company_source
ORDER BY cnt DESC
LIMIT 15
""").fetchall()
for r in result:
    tpid = str(r[0])[:40] if r[0] else ''
    company = str(r[1])[:30] if r[1] else ''
    print(f'tpid: {tpid:40} | company: {company:30} | source: {r[2]} | count: {r[3]}')

print()
print('=== How many learners have company_source = msft_tpid? ===')
result = conn.execute(f"""
SELECT COUNT(*) FROM read_parquet('{parquet_path}')
WHERE company_source = 'msft_tpid'
""").fetchone()
print(f'Learners with company from msft_tpid: {result[0]}')

print()
print('=== Company source breakdown ===')
result = conn.execute(f"""
SELECT company_source, COUNT(*) as cnt
FROM read_parquet('{parquet_path}')
GROUP BY company_source
ORDER BY cnt DESC
""").fetchall()
for r in result:
    print(f'{r[0]}: {r[1]:,}')
