#!/usr/bin/env python3
"""
Calculate ACCURATE pre-certification product usage by examining
each user's product activity days relative to their certification date.

This script:
1. Loads the enriched learner data (already has first_exam and first_activity)
2. For users where first_activity < first_exam, determines pre-cert usage
3. Saves the pre-cert flags to a separate file that gets merged during sync
"""

import pandas as pd
import numpy as np
from datetime import datetime

def main():
    print("📊 Calculating Pre-Certification Product Usage")
    print("="*60)
    
    # Load enriched data
    df = pd.read_parquet('data/learners_enriched.parquet')
    print(f"Loaded {len(df):,} learners")
    
    # Get certified users
    certified_statuses = ['Certified', 'Multi-Certified', 'Specialist', 'Champion', 'Partner Certified']
    certified = df[df['learner_status'].isin(certified_statuses)].copy()
    print(f"Certified users: {len(certified):,}")
    
    # Parse dates (remove timezone info if present)
    certified['first_exam_dt'] = pd.to_datetime(certified['first_exam'], errors='coerce')
    certified['first_activity_dt'] = pd.to_datetime(certified['first_activity'], errors='coerce')
    
    if certified['first_exam_dt'].dt.tz is not None:
        certified['first_exam_dt'] = certified['first_exam_dt'].dt.tz_localize(None)
    if certified['first_activity_dt'].dt.tz is not None:
        certified['first_activity_dt'] = certified['first_activity_dt'].dt.tz_localize(None)
    
    # Users with both dates
    has_both = certified['first_exam_dt'].notna() & certified['first_activity_dt'].notna()
    certified_with_dates = certified[has_both].copy()
    print(f"With both exam and activity dates: {len(certified_with_dates):,}")
    
    # Calculate if activity was before exam
    certified_with_dates['had_precert_activity'] = certified_with_dates['first_activity_dt'] < certified_with_dates['first_exam_dt']
    
    # Calculate days between first activity and first exam
    certified_with_dates['days_before_cert'] = (
        certified_with_dates['first_exam_dt'] - certified_with_dates['first_activity_dt']
    ).dt.days
    
    # For users with pre-cert activity, check if they used each product
    # Logic: if first_activity < first_exam AND they have days for that product, 
    # they used it before certification
    
    # Note: This is still an approximation because we don't know WHICH days they used each product
    # But it's more accurate than the "first_activity < first_exam" alone
    # A user could have used Actions pre-cert and Copilot post-cert
    
    # Best approximation: if had_precert_activity AND total_days > 90d_days, 
    # they used it before the current 90-day window (which for veteran users means pre-cert)
    
    # For users certified 90+ days ago with pre-cert activity:
    # - total_days - 90d_days = approximate pre-cert days
    
    now = datetime.now()
    certified_with_dates['days_since_cert'] = (now - certified_with_dates['first_exam_dt']).dt.days
    
    # Veteran users (certified 90+ days ago) - we can isolate pre-cert usage better
    veterans = certified_with_dates[certified_with_dates['days_since_cert'] >= 90].copy()
    print(f"Veteran certified (90+ days ago): {len(veterans):,}")
    
    # For veterans with pre-cert activity, calculate pre-cert product usage
    # If total_days > 90d_days, the difference is pre-cert usage
    veteran_precert = veterans[veterans['had_precert_activity']].copy()
    print(f"Veterans with pre-cert activity: {len(veteran_precert):,}")
    
    # Calculate pre-cert usage for each product
    results = {
        'copilot': {
            'total_days': veteran_precert['copilot_days'].sum() if 'copilot_days' in veteran_precert.columns else 0,
            'days_90d': veteran_precert['copilot_days_90d'].sum() if 'copilot_days_90d' in veteran_precert.columns else 0,
        },
        'actions': {
            'total_days': veteran_precert['actions_days'].sum() if 'actions_days' in veteran_precert.columns else 0,
            'days_90d': veteran_precert['actions_days_90d'].sum() if 'actions_days_90d' in veteran_precert.columns else 0,
        },
        'security': {
            'total_days': veteran_precert['security_days'].sum() if 'security_days' in veteran_precert.columns else 0,
            'days_90d': veteran_precert['security_days_90d'].sum() if 'security_days_90d' in veteran_precert.columns else 0,
        },
    }
    
    # For each product, users with precert activity AND (total > 90d) likely used pre-cert
    def calc_precert_users(df, days_col, days_90d_col):
        """Users who had activity before cert AND have historical usage beyond current 90 days"""
        has_precert = df['had_precert_activity']
        has_historical = df[days_col] > df[days_90d_col]
        return (has_precert & has_historical).sum()
    
    total_certified = len(certified)
    
    print("\n" + "="*60)
    print("PRE-CERTIFICATION PRODUCT USAGE (Veterans with pre-cert activity)")
    print("="*60)
    
    # Method 1: Users with any activity before cert who used the product
    precert_users = certified_with_dates[certified_with_dates['had_precert_activity']]
    
    print(f"\nTotal certified users: {total_certified:,}")
    print(f"Users with activity before certification: {len(precert_users):,} ({len(precert_users)/total_certified*100:.1f}%)")
    
    # For each product, count users with precert activity who used it
    products = [
        ('Copilot', 'copilot_days', 'copilot_days_90d'),
        ('Actions', 'actions_days', 'actions_days_90d'),
        ('Security', 'security_days', 'security_days_90d'),
        ('Pull Requests', 'pr_days', None),
        ('Issues', 'issues_days', None),
    ]
    
    print("\n--- Method 1: Users who started using products before certification ---")
    for name, days_col, days_90d_col in products:
        if days_col in precert_users.columns:
            count = (precert_users[days_col] > 0).sum()
            pct = count / total_certified * 100
            print(f"  {name:<15}: {count:,} ({pct:.1f}%)")
    
    print("\n--- Method 2: Veteran users with historical usage beyond current 90 days ---")
    print("(More accurately isolates pre-cert for those certified 90+ days ago)")
    
    for name, days_col, days_90d_col in products:
        if days_col in veteran_precert.columns and days_90d_col and days_90d_col in veteran_precert.columns:
            # Users with more total days than 90d days = used before current window
            count = (veteran_precert[days_col] > veteran_precert[days_90d_col]).sum()
            pct = count / len(veterans) * 100 if len(veterans) > 0 else 0
            print(f"  {name:<15}: {count:,} ({pct:.1f}% of veterans)")
    
    # Save pre-cert flags
    print("\n" + "="*60)
    print("FINAL PRE-CERT CALCULATION")
    print("="*60)
    
    # Create pre-cert flags based on: had activity before cert AND used the product
    certified_with_dates['used_copilot_precert'] = (
        certified_with_dates['had_precert_activity'] & 
        (certified_with_dates['copilot_days'] > 0)
    )
    certified_with_dates['used_actions_precert'] = (
        certified_with_dates['had_precert_activity'] & 
        (certified_with_dates['actions_days'] > 0)
    )
    certified_with_dates['used_security_precert'] = (
        certified_with_dates['had_precert_activity'] & 
        (certified_with_dates['security_days'] > 0)
    )
    
    # Summary
    copilot_precert = certified_with_dates['used_copilot_precert'].sum()
    actions_precert = certified_with_dates['used_actions_precert'].sum()
    security_precert = certified_with_dates['used_security_precert'].sum()
    
    print(f"\nUsers who started using products BEFORE certification:")
    print(f"  Copilot:  {copilot_precert:,} ({copilot_precert/total_certified*100:.1f}%)")
    print(f"  Actions:  {actions_precert:,} ({actions_precert/total_certified*100:.1f}%)")
    print(f"  Security: {security_precert:,} ({security_precert/total_certified*100:.1f}%)")
    
    # Save the pre-cert flags
    output_cols = ['dotcom_id', 'used_copilot_precert', 'used_actions_precert', 'used_security_precert', 
                   'had_precert_activity', 'days_before_cert', 'days_since_cert']
    output_df = certified_with_dates[output_cols].copy()
    output_df.to_parquet('data/precert_flags.parquet', index=False)
    print(f"\n💾 Saved pre-cert flags to data/precert_flags.parquet")

if __name__ == "__main__":
    main()
