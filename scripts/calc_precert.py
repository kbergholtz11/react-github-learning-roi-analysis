#!/usr/bin/env python3
"""
Calculate pre-certification product usage from existing enriched data.
Uses first_activity and first_exam dates to identify pre-cert usage.
"""

import pandas as pd
from datetime import datetime

def main():
    print("📊 Calculating Pre-Certification Product Usage")
    print("="*60)
    
    # Load enriched data
    df = pd.read_parquet('data/learners_enriched.parquet')
    
    # Get certified users
    certified = df[df['learner_status'].isin([
        'Certified', 'Multi-Certified', 'Specialist', 'Champion', 'Partner Certified'
    ])].copy()
    print(f"Total certified users: {len(certified):,}")
    
    # Parse dates
    certified['first_exam'] = pd.to_datetime(certified['first_exam'], errors='coerce')
    certified['first_activity'] = pd.to_datetime(certified['first_activity'], errors='coerce')
    
    # Remove timezone info for comparison
    if certified['first_exam'].dt.tz is not None:
        certified['first_exam'] = certified['first_exam'].dt.tz_localize(None)
    if certified['first_activity'].dt.tz is not None:
        certified['first_activity'] = certified['first_activity'].dt.tz_localize(None)
    
    # Users with both dates
    both_dates = certified[certified['first_exam'].notna() & certified['first_activity'].notna()]
    print(f"With both exam and activity dates: {len(both_dates):,}")
    
    # Users where first product activity was BEFORE first exam = pre-cert usage
    precert_users = both_dates[both_dates['first_activity'] < both_dates['first_exam']]
    print(f"Users with pre-cert product activity: {len(precert_users):,}")
    print(f"Pre-cert rate: {len(precert_users)/len(both_dates)*100:.1f}%")
    
    # Calculate pre-cert product usage
    # If a user's first_activity < first_exam AND they have product usage, they used it pre-cert
    print("\n" + "="*60)
    print("PRE-CERTIFICATION PRODUCT USAGE")
    print("(Users who started using products BEFORE certification)")
    print("="*60)
    
    # For users with pre-cert activity, check each product
    precert_copilot = precert_users[precert_users['copilot_days'] > 0]
    precert_actions = precert_users[precert_users['actions_days'] > 0] 
    precert_security = precert_users[precert_users['security_days'] > 0]
    precert_pr = precert_users[precert_users['pr_days'] > 0] if 'pr_days' in precert_users.columns else pd.DataFrame()
    precert_issues = precert_users[precert_users['issues_days'] > 0] if 'issues_days' in precert_users.columns else pd.DataFrame()
    
    total_cert = len(certified)
    
    print(f"\nCopilot:  {len(precert_copilot):,} ({len(precert_copilot)/total_cert*100:.1f}%)")
    print(f"Actions:  {len(precert_actions):,} ({len(precert_actions)/total_cert*100:.1f}%)")
    print(f"Security: {len(precert_security):,} ({len(precert_security)/total_cert*100:.1f}%)")
    if len(precert_pr) > 0:
        print(f"PRs:      {len(precert_pr):,} ({len(precert_pr)/total_cert*100:.1f}%)")
    if len(precert_issues) > 0:
        print(f"Issues:   {len(precert_issues):,} ({len(precert_issues)/total_cert*100:.1f}%)")
    
    # Compare with post-cert usage (current 90d)
    print("\n" + "="*60)
    print("POST-CERTIFICATION PRODUCT USAGE (Current 90 Days)")
    print("="*60)
    
    post_copilot = certified[certified['uses_copilot'] == True] if 'uses_copilot' in certified.columns else pd.DataFrame()
    post_actions = certified[certified['uses_actions'] == True] if 'uses_actions' in certified.columns else pd.DataFrame()
    post_security = certified[certified['uses_security'] == True] if 'uses_security' in certified.columns else pd.DataFrame()
    
    print(f"\nCopilot:  {len(post_copilot):,} ({len(post_copilot)/total_cert*100:.1f}%)")
    print(f"Actions:  {len(post_actions):,} ({len(post_actions)/total_cert*100:.1f}%)")
    print(f"Security: {len(post_security):,} ({len(post_security)/total_cert*100:.1f}%)")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY: Pre-Cert vs Post-Cert Adoption")
    print("="*60)
    print(f"\n{'Product':<12} {'Pre-Cert':<15} {'Post-Cert (90d)':<15} {'Change':<10}")
    print("-"*52)
    
    pre_copilot_pct = len(precert_copilot)/total_cert*100
    post_copilot_pct = len(post_copilot)/total_cert*100
    print(f"{'Copilot':<12} {pre_copilot_pct:.1f}%{'':<10} {post_copilot_pct:.1f}%{'':<10} {post_copilot_pct - pre_copilot_pct:+.1f}pp")
    
    pre_actions_pct = len(precert_actions)/total_cert*100
    post_actions_pct = len(post_actions)/total_cert*100
    print(f"{'Actions':<12} {pre_actions_pct:.1f}%{'':<10} {post_actions_pct:.1f}%{'':<10} {post_actions_pct - pre_actions_pct:+.1f}pp")
    
    pre_security_pct = len(precert_security)/total_cert*100
    post_security_pct = len(post_security)/total_cert*100
    print(f"{'Security':<12} {pre_security_pct:.1f}%{'':<10} {post_security_pct:.1f}%{'':<10} {post_security_pct - pre_security_pct:+.1f}pp")

if __name__ == "__main__":
    main()
