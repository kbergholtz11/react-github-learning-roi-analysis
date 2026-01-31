#!/usr/bin/env python3
"""Analyze email domains for learners without company attribution."""

import pandas as pd

df = pd.read_parquet('data/learners_enriched.parquet')

print('=== EMAIL ANALYSIS ===')
print(f'Total learners: {len(df):,}')
print(f'With email: {df["email"].notna().sum():,}')
print(f'Without company: {(df["company_source"] == "none").sum():,}')

# Look at emails of users without company
no_company = df[df['company_source'] == 'none'].copy()
print(f'\nNo company learners with email: {no_company["email"].notna().sum():,}')

# Count by domain type
def get_domain(email):
    if pd.isna(email):
        return 'none'
    if '@' not in str(email):
        return 'invalid'
    domain = str(email).split('@')[1].lower()
    personal = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 
                'live.com', 'me.com', 'aol.com', 'protonmail.com', 'mail.com', 'msn.com',
                'ymail.com', 'qq.com', '163.com', '126.com', 'naver.com', 'googlemail.com',
                'hotmail.co.uk', 'yahoo.co.uk', 'outlook.de', 'web.de', 'gmx.de', 'gmx.net']
    if any(domain == p for p in personal):
        return 'personal'
    if '.edu' in domain or domain.endswith('.ac.uk') or domain.endswith('.edu.br'):
        return 'edu'
    if '.gov' in domain or '.mil' in domain:
        return 'gov'
    return 'corporate'

no_company['domain_type'] = no_company['email'].apply(get_domain)
print('\nDomain breakdown for learners without company:')
print(no_company['domain_type'].value_counts())

# Count corporate domains
corporate = no_company[no_company['domain_type'] == 'corporate']
print(f'\n=== CORPORATE EMAIL DOMAINS (potential company attribution) ===')
print(f'Total: {len(corporate):,}')

# Get domain counts
def extract_domain(email):
    if pd.isna(email) or '@' not in str(email):
        return None
    return str(email).split('@')[1].lower()

corporate['domain'] = corporate['email'].apply(extract_domain)
domain_counts = corporate['domain'].value_counts().head(50)
print('\nTop 50 corporate domains without company:')
for domain, count in domain_counts.items():
    print(f'  {domain}: {count}')

print('\n=== POTENTIAL UPLIFT ===')
print(f'Corporate emails without company: {len(corporate):,}')
print(f'This could increase company attribution by: {len(corporate)/len(df)*100:.1f}%')
