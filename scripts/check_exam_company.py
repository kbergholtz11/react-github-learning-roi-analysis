#!/usr/bin/env python3
import duckdb
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
parquet_path = os.path.join(project_root, 'data', 'learners_enriched.parquet')

conn = duckdb.connect()
result = conn.execute(f"""
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN exam_company IS NOT NULL AND exam_company != '' THEN 1 ELSE 0 END) as has_exam_company,
    SUM(CASE WHEN ace_company IS NOT NULL AND ace_company != '' THEN 1 ELSE 0 END) as has_ace_company,
    SUM(CASE WHEN (company_name IS NULL OR company_name = '') 
        AND (exam_company IS NOT NULL AND exam_company != '') THEN 1 ELSE 0 END) as exam_only,
    SUM(CASE WHEN (company_name IS NULL OR company_name = '') 
        AND (ace_company IS NOT NULL AND ace_company != '') THEN 1 ELSE 0 END) as ace_only
FROM read_parquet('{parquet_path}')
""").fetchone()
print(f'Total: {result[0]:,}')
print(f'Has exam_company: {result[1]:,}')
print(f'Has ace_company: {result[2]:,}')
print(f'Has exam_company but NO company_name: {result[3]:,}')
print(f'Has ace_company but NO company_name: {result[4]:,}')
