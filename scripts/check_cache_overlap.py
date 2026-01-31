#!/usr/bin/env python3
"""Check overlap between ACE and Skills cache files"""
import pandas as pd

ace = pd.read_parquet('data/.cache/ace_learners.parquet')
skills = pd.read_parquet('data/.cache/skills_users.parquet')

print('=== ACE Learners ===')
print(f'Rows: {len(ace):,}')
print(f'Columns: {list(ace.columns)}')
if 'dotcom_id' in ace.columns:
    print(f'Unique dotcom_ids: {ace["dotcom_id"].nunique():,}')
    print(f'Non-zero dotcom_ids: {(ace["dotcom_id"] > 0).sum():,}')

print()
print('=== Skills Users ===')  
print(f'Rows: {len(skills):,}')
print(f'Columns: {list(skills.columns)}')
if 'dotcom_id' in skills.columns:
    print(f'Unique dotcom_ids: {skills["dotcom_id"].nunique():,}')

# Check overlap
print()
print('=== Overlap Check ===')
if 'dotcom_id' in ace.columns and 'dotcom_id' in skills.columns:
    ace_ids = set(ace[ace['dotcom_id'] > 0]['dotcom_id'].dropna())
    skills_ids = set(skills[skills['dotcom_id'] > 0]['dotcom_id'].dropna())
    overlap = ace_ids & skills_ids
    print(f'ACE unique non-zero IDs: {len(ace_ids):,}')
    print(f'Skills unique non-zero IDs: {len(skills_ids):,}')
    print(f'Overlap: {len(overlap):,}')
    if len(overlap) > 0:
        print(f'Sample overlap IDs: {list(overlap)[:5]}')
