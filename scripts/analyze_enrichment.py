#!/usr/bin/env python3
"""Analyze enrichment data quality."""
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# Load the enriched data
df = pd.read_parquet(DATA_DIR / 'learners_enriched.parquet')

print('=== CERTIFICATION VALIDATION ===')
print(f'Total learners: {len(df):,}')
print(f'exams_passed > 0 (Certified): {(df["exams_passed"] > 0).sum():,}')

print('\n=== COMPANY ANALYSIS ===')
with_company = (df["company_name"] != "").sum()
print(f'Total with company: {with_company:,} ({with_company/len(df)*100:.1f}%)')
print(f'Total without company: {(df["company_name"] == "").sum():,}')

no_company = df[df["company_name"] == ""]
print(f'\nBreakdown of {len(no_company):,} learners without company:')
print(f'  - With dotcom_id: {(no_company["dotcom_id"] > 0).sum():,}')
print(f'  - Without dotcom_id: {(no_company["dotcom_id"] <= 0).sum():,}')

print('\n=== DOTCOM_ID COVERAGE ===')
print(f'With dotcom_id > 0: {(df["dotcom_id"] > 0).sum():,}')
print(f'Without dotcom_id: {(df["dotcom_id"] <= 0).sum():,}')
