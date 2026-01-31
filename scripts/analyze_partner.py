#!/usr/bin/env python3
import duckdb
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
parquet_path = os.path.join(project_root, 'data', 'learners_enriched.parquet')

conn = duckdb.connect()

# Check what partner_companies looks like
print('=== Sample partner_companies values ===')
result = conn.execute(f"""
SELECT partner_companies, company_name, exam_company
FROM read_parquet('{parquet_path}')
WHERE partner_companies IS NOT NULL AND len(partner_companies) > 0
LIMIT 10
""").fetchall()
for r in result:
    print(f'partner_companies: {r[0]}, company_name: {r[1]}, exam_company: {r[2]}')

# Check if partner learners have company_name populated
print()
print('=== Partner learners company attribution ===')
result = conn.execute(f"""
SELECT 
    SUM(CASE WHEN partner_companies IS NOT NULL AND len(partner_companies) > 0 THEN 1 ELSE 0 END) as total_partner_learners,
    SUM(CASE WHEN partner_companies IS NOT NULL AND len(partner_companies) > 0 
        AND (company_name IS NULL OR company_name = '') THEN 1 ELSE 0 END) as partner_without_company_name
FROM read_parquet('{parquet_path}')
""").fetchone()
print(f'Total partner learners: {result[0]}')
print(f'Partner learners WITHOUT company_name: {result[1]}')

# Check what columns exist for partner data
print()
print('=== Partner-related columns ===')
cols = conn.execute(f"DESCRIBE SELECT * FROM read_parquet('{parquet_path}')").fetchall()
partner_cols = [c[0] for c in cols if 'partner' in c[0].lower()]
print(f'Partner columns: {partner_cols}')

# Check is_partner field
print()
print('=== is_partner field analysis ===')
result = conn.execute(f"""
SELECT 
    SUM(CASE WHEN is_partner = true THEN 1 ELSE 0 END) as is_partner_true,
    SUM(CASE WHEN is_partner = true AND (company_name IS NULL OR company_name = '') THEN 1 ELSE 0 END) as partner_no_company
FROM read_parquet('{parquet_path}')
""").fetchone()
print(f'is_partner = true: {result[0]}')
print(f'is_partner = true WITHOUT company_name: {result[1]}')
