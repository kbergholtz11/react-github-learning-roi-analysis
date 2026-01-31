#!/usr/bin/env python3
"""Analyze dotcom_id mapping potential for skills users."""
import csv
import sys
csv.field_size_limit(sys.maxsize)

# Read learners_enriched to get handle -> dotcom_id mapping
handle_to_dotcom = {}
dotcom_users = 0
no_dotcom_users = 0

with open('data/learners_enriched.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        handle = row.get('userhandle', '').strip().lower()
        dotcom_id = row.get('dotcom_id', '')
        
        try:
            dotcom_val = int(float(dotcom_id)) if dotcom_id and dotcom_id not in ['', 'nan', 'None'] else 0
        except:
            dotcom_val = 0
            
        if handle:
            if dotcom_val > 0:
                handle_to_dotcom[handle] = dotcom_val
                dotcom_users += 1
            else:
                no_dotcom_users += 1

print(f"=== HANDLE TO DOTCOM_ID MAPPING ===")
print(f"Users with handle AND dotcom_id: {dotcom_users:,}")
print(f"Users with handle but NO dotcom_id: {no_dotcom_users:,}")
print(f"Total unique handles with dotcom_id: {len(handle_to_dotcom):,}")

# Now check skills_all_enrollments to see how many we could map
skills_handles = set()
with open('data/skills_all_enrollments.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        handle = row.get('handle', '').strip().lower()
        if handle:
            skills_handles.add(handle)

print(f"\n=== SKILLS ENROLLMENTS ===")
print(f"Unique handles in skills_all_enrollments: {len(skills_handles):,}")

# How many can we map?
matched = 0
for handle in skills_handles:
    if handle in handle_to_dotcom:
        matched += 1

print(f"Handles that match learners_enriched: {matched:,}")
print(f"Handles NOT in learners_enriched: {len(skills_handles) - matched:,}")

# Check github_activity.csv - has handle field
print(f"\n=== GITHUB ACTIVITY DATA ===")
activity_handles = set()
with open('data/github_activity.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        handle = row.get('handle', '').strip().lower()
        if handle:
            activity_handles.add(handle)

print(f"Unique handles in github_activity: {len(activity_handles):,}")

# Check github_learn.csv - has dotcom_id
print(f"\n=== GITHUB LEARN DATA ===")
with open('data/github_learn.csv', 'r') as f:
    reader = csv.DictReader(f)
    learn_dotcom_ids = set()
    for row in reader:
        try:
            dotcom_id = int(float(row.get('dotcom_id', 0)))
            if dotcom_id > 0:
                learn_dotcom_ids.add(dotcom_id)
        except:
            pass
print(f"Unique dotcom_ids in github_learn: {len(learn_dotcom_ids):,}")

# Check github_skills.csv - has dotcom_id
print(f"\n=== GITHUB SKILLS DATA ===")
with open('data/github_skills.csv', 'r') as f:
    reader = csv.DictReader(f)
    skills_dotcom_ids = set()
    for row in reader:
        try:
            dotcom_id = int(float(row.get('dotcom_id', 0)))
            if dotcom_id > 0:
                skills_dotcom_ids.add(dotcom_id)
        except:
            pass
print(f"Unique dotcom_ids in github_skills: {len(skills_dotcom_ids):,}")

# Check product_usage.csv - has dotcom_id
print(f"\n=== PRODUCT USAGE DATA ===")
with open('data/product_usage.csv', 'r') as f:
    reader = csv.DictReader(f)
    usage_dotcom_ids = set()
    for row in reader:
        try:
            dotcom_id = int(float(row.get('dotcom_id', 0)))
            if dotcom_id > 0:
                usage_dotcom_ids.add(dotcom_id)
        except:
            pass
print(f"Unique dotcom_ids in product_usage: {len(usage_dotcom_ids):,}")

# Look for users that have dotcom_id somewhere but not in learners_enriched
print(f"\n=== POTENTIAL ADDITIONAL MAPPING ===")
all_known_dotcom_ids = set(handle_to_dotcom.values())
new_from_learn = learn_dotcom_ids - all_known_dotcom_ids
new_from_skills = skills_dotcom_ids - all_known_dotcom_ids
new_from_usage = usage_dotcom_ids - all_known_dotcom_ids

print(f"New dotcom_ids from github_learn: {len(new_from_learn):,}")
print(f"New dotcom_ids from github_skills: {len(new_from_skills):,}")
print(f"New dotcom_ids from product_usage: {len(new_from_usage):,}")

# Union all new
all_additional = new_from_learn | new_from_skills | new_from_usage
print(f"Total unique additional dotcom_ids: {len(all_additional):,}")
