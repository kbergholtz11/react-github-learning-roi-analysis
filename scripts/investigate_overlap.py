#!/usr/bin/env python3
"""
Investigate why there's no overlap between Skills and Certs users.
Check the raw query output files if they exist.
"""
import os
import pandas as pd

data_dir = "data"

# Check if we can find the intermediate query results
cache_dir = os.path.join(data_dir, ".cache")
if os.path.exists(cache_dir):
    print(f"=== Cache files found ===")
    for f in os.listdir(cache_dir):
        print(f"  {f}")
else:
    print("No cache directory found")

# Load the parquet file and analyze
print("\n=== Analyzing learners_enriched.parquet ===")
df = pd.read_parquet(os.path.join(data_dir, "learners_enriched.parquet"))

# Check dotcom_id uniqueness
print(f"Total rows: {len(df):,}")
print(f"Unique dotcom_ids: {df['dotcom_id'].nunique():,}")
print(f"Null dotcom_ids: {df['dotcom_id'].isna().sum():,}")
print(f"Zero dotcom_ids: {(df['dotcom_id'] == 0).sum():,}")

# Check for duplicates
dups = df['dotcom_id'].value_counts()
dups_more_than_1 = dups[dups > 1]
if len(dups_more_than_1) > 0:
    print(f"\nDuplicate dotcom_ids: {len(dups_more_than_1):,}")
    print(f"  Example: {dups_more_than_1.head()}")
else:
    print("\nNo duplicate dotcom_ids")

# Check the data types
print(f"\n=== Data types ===")
print(f"exams_passed type: {df['exams_passed'].dtype}")
print(f"skills_count type: {df['skills_count'].dtype}")

# Check value distributions
print(f"\n=== Value distributions ===")
print(f"exams_passed: min={df['exams_passed'].min()}, max={df['exams_passed'].max()}, non-zero={df['exams_passed'].gt(0).sum():,}")
print(f"skills_count: min={df['skills_count'].min()}, max={df['skills_count'].max()}, non-null={df['skills_count'].notna().sum():,}")

# See if skills_count is stored as float or has decimals
skills_non_null = df[df['skills_count'].notna()]['skills_count']
if len(skills_non_null) > 0:
    print(f"skills_count sample values: {skills_non_null.head(10).tolist()}")
    has_decimals = (skills_non_null % 1 != 0).any()
    print(f"  Has decimal values: {has_decimals}")

# Check if exams_passed is 0 or NaN for skills users
skills_users = df[df['skills_count'].notna() & (df['skills_count'] > 0)]
print(f"\n=== Skills users exam data ===")
print(f"Skills users with exams_passed > 0: {(skills_users['exams_passed'] > 0).sum():,}")
print(f"Skills users with exams_passed == 0: {(skills_users['exams_passed'] == 0).sum():,}")
print(f"Skills users with exams_passed NaN: {skills_users['exams_passed'].isna().sum():,}")
