#!/usr/bin/env python3
import duckdb
import os

# Get the script directory and compute the data path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
parquet_path = os.path.join(project_root, 'data', 'learners_enriched.parquet')

conn = duckdb.connect()
result = conn.execute(f"""
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN company_name IS NOT NULL AND company_name != '' THEN 1 ELSE 0 END) as has_company_name,
    SUM(CASE WHEN exam_company IS NOT NULL AND exam_company != '' THEN 1 ELSE 0 END) as has_exam_company,
    SUM(CASE WHEN partner_companies IS NOT NULL AND len(partner_companies) > 0 THEN 1 ELSE 0 END) as has_partner_companies,
    SUM(CASE WHEN 
        (company_name IS NOT NULL AND company_name != '') OR
        (exam_company IS NOT NULL AND exam_company != '') OR
        (partner_companies IS NOT NULL AND len(partner_companies) > 0)
    THEN 1 ELSE 0 END) as has_any_company
FROM read_parquet('{parquet_path}')
""").fetchone()

print(f"Total learners: {result[0]}")
print(f"Has company_name: {result[1]}")
print(f"Has exam_company: {result[2]}")
print(f"Has partner_companies: {result[3]}")
print(f"Has ANY company field: {result[4]}")
