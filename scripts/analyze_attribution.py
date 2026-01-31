#!/usr/bin/env python3
"""Analyze company attribution sources."""

import pandas as pd
df = pd.read_parquet('data/learners_enriched.parquet')

# Check partner_credential users
partner = df[df['company_source'] == 'partner_credential']
print('=== PARTNER CREDENTIAL USERS ===')
print(f'Total: {len(partner)}')
print(f'Sample companies: {partner["company_name"].value_counts().head(10).to_dict()}')

# Check if these users also have ace/exam company data
print(f'Also have ace_company: {partner["ace_company"].notna().sum()}')
print(f'Also have exam_company: {partner["exam_company"].notna().sum()}')

# Check ace/exam users for comparison
print('\n=== ACE REGISTRATION USERS ===')
ace = df[df['company_source'] == 'ace_registration']
print(f'Total: {len(ace)}')
print(f'Sample companies: {ace["company_name"].value_counts().head(5).to_dict()}')

print('\n=== EXAM REGISTRATION USERS ===')
exam = df[df['company_source'] == 'exam_registration']
print(f'Total: {len(exam)}')
print(f'Sample companies: {exam["company_name"].value_counts().head(5).to_dict()}')

# The key insight: partner_credential is BETWEEN salesforce (tier 2-3) and ace/exam (tier 5-6)
# So partner_credential can OVERRIDE ace/exam but gets overridden by salesforce
print('\n=== CURRENT PRIORITY ORDER (later wins) ===')
print('8. email_domain (lowest)')
print('7. org_name')
print('6. ace_registration')
print('5. exam_registration')
print('4. partner_credential  <-- Currently HIGHER than ace/exam')
print('3. salesforce (org)')
print('2. salesforce (user)')
print('1. billing_customer (highest)')

print('\n=== RECOMMENDATION ===')
print('Move partner_credential BELOW ace/exam, since:')
print('- Partner company is from certification partner (e.g., FastLane, Global Knowledge)')
print('- ACE/Exam company is what the USER reported for their employer')
print('- User-reported employer is more relevant for company attribution')
