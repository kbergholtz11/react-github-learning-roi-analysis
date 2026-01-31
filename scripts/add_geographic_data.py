#!/usr/bin/env python3
"""Add geographic breakdown to metrics.json for certification analytics."""

import pyarrow.parquet as pq
import pandas as pd
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# Country name normalization map
COUNTRY_NORMALIZATION = {
    # United States variations
    'US': 'United States',
    'USA': 'United States',
    'U.S.': 'United States',
    'U.S.A.': 'United States',
    'America': 'United States',
    
    # India variations
    'IN': 'India',
    
    # United Kingdom variations
    'UK': 'United Kingdom',
    'GB': 'United Kingdom',
    'Great Britain': 'United Kingdom',
    'England': 'United Kingdom',
    
    # Brazil variations
    'BR': 'Brazil',
    'Brasil': 'Brazil',
    
    # Germany variations
    'DE': 'Germany',
    'Deutschland': 'Germany',
    
    # Japan variations
    'JP': 'Japan',
    
    # China variations
    'CN': 'China',
    
    # Australia variations
    'AU': 'Australia',
    
    # Canada variations
    'CA': 'Canada',
    
    # France variations
    'FR': 'France',
    
    # Spain variations
    'ES': 'Spain',
    
    # Mexico variations
    'MX': 'Mexico',
    
    # Netherlands variations
    'NL': 'Netherlands',
    'Holland': 'Netherlands',
    
    # South Korea variations
    'KR': 'South Korea',
    'Korea': 'South Korea',
    'Korea, South': 'South Korea',
    'Korea, Republic of': 'South Korea',
    
    # Singapore variations
    'SG': 'Singapore',
    
    # Poland variations
    'PL': 'Poland',
    
    # Italy variations
    'IT': 'Italy',
    
    # Argentina variations
    'AR': 'Argentina',
    
    # Colombia variations
    'CO': 'Colombia',
    
    # Philippines variations
    'PH': 'Philippines',
    
    # Vietnam variations
    'VN': 'Vietnam',
    'Viet Nam': 'Vietnam',
    
    # South Africa
    'ZA': 'South Africa',
    
    # Peru
    'PE': 'Peru',
    
    # Nigeria
    'NG': 'Nigeria',
    
    # Romania
    'RO': 'Romania',
    
    # Chile
    'CL': 'Chile',
    
    # Sri Lanka
    'LK': 'Sri Lanka',
    
    # Norway
    'NO': 'Norway',
    
    # Egypt
    'EG': 'Egypt',
    
    # Pakistan
    'PK': 'Pakistan',
    
    # Portugal
    'PT': 'Portugal',
    
    # Ecuador
    'EC': 'Ecuador',
    
    # Costa Rica
    'CR': 'Costa Rica',
    
    # Guatemala
    'GT': 'Guatemala',
    
    # Bolivia
    'BO': 'Bolivia',
    
    # Malaysia
    'MY': 'Malaysia',
    
    # Indonesia
    'ID': 'Indonesia',
    
    # Thailand
    'TH': 'Thailand',
    
    # Taiwan
    'TW': 'Taiwan',
    
    # Hong Kong
    'HK': 'Hong Kong',
    
    # New Zealand
    'NZ': 'New Zealand',
    
    # Ireland
    'IE': 'Ireland',
    
    # Sweden
    'SE': 'Sweden',
    
    # Switzerland
    'CH': 'Switzerland',
    
    # Belgium
    'BE': 'Belgium',
    
    # Austria
    'AT': 'Austria',
    
    # Denmark
    'DK': 'Denmark',
    
    # Finland
    'FI': 'Finland',
    
    # Czech Republic
    'CZ': 'Czech Republic',
    
    # Hungary
    'HU': 'Hungary',
    
    # Greece
    'GR': 'Greece',
    
    # Turkey
    'TR': 'Turkey',
    
    # Israel
    'IL': 'Israel',
    
    # United Arab Emirates
    'AE': 'United Arab Emirates',
    'UAE': 'United Arab Emirates',
    
    # Saudi Arabia
    'SA': 'Saudi Arabia',
    
    # Kenya
    'KE': 'Kenya',
    
    # Morocco
    'MA': 'Morocco',
    
    # Ukraine
    'UA': 'Ukraine',
    
    # Russia
    'RU': 'Russia',
    
    # Bangladesh
    'BD': 'Bangladesh',
    
    # Nepal
    'NP': 'Nepal',
    
    # Uruguay
    'UY': 'Uruguay',
    
    # Paraguay
    'PY': 'Paraguay',
    
    # Venezuela
    'VE': 'Venezuela',
    
    # Panama
    'PA': 'Panama',
    
    # Dominican Republic
    'DO': 'Dominican Republic',
    
    # Honduras
    'HN': 'Honduras',
    
    # El Salvador
    'SV': 'El Salvador',
    
    # Nicaragua
    'NI': 'Nicaragua',
    
    # Jamaica
    'JM': 'Jamaica',
    
    # Trinidad and Tobago
    'TT': 'Trinidad and Tobago',
    
    # Puerto Rico
    'PR': 'Puerto Rico',
    
    # Luxembourg
    'LU': 'Luxembourg',
    
    # Slovakia
    'SK': 'Slovakia',
    
    # Bulgaria
    'BG': 'Bulgaria',
    
    # Croatia
    'HR': 'Croatia',
    
    # Slovenia
    'SI': 'Slovenia',
    
    # Serbia
    'RS': 'Serbia',
    
    # Lithuania
    'LT': 'Lithuania',
    
    # Latvia
    'LV': 'Latvia',
    
    # Estonia
    'EE': 'Estonia',
    
    # Tunisia
    'TN': 'Tunisia',
    
    # Ghana
    'GH': 'Ghana',
    
    # Cambodia
    'KH': 'Cambodia',
    
    # Myanmar
    'MM': 'Myanmar',
    
    # Mongolia
    'MN': 'Mongolia',
    
    # Laos
    'LA': 'Laos',
    
    # Uganda
    'UG': 'Uganda',
    
    # Zimbabwe
    'ZW': 'Zimbabwe',
    
    # Qatar
    'QA': 'Qatar',
    
    # Georgia
    'GE': 'Georgia',
    
    # Malta
    'MT': 'Malta',
    
    # Cuba
    'CU': 'Cuba',
    
    # Haiti
    'HT': 'Haiti',
    
    # Bahamas
    'BS': 'Bahamas',
    
    # Barbados
    'BB': 'Barbados',
    
    # Turkey/Turkiye
    'Turkiye': 'Turkey',
    'Türkiye': 'Turkey',
    
    # Kazakhstan
    'KZ': 'Kazakhstan',
    
    # Cameroon
    'CM': 'Cameroon',
    
    # Jordan
    'JO': 'Jordan',
    
    # Uzbekistan
    'UZ': 'Uzbekistan',
    
    # Senegal
    'SN': 'Senegal',
    
    # Algeria
    'DZ': 'Algeria',
    
    # Lebanon
    'LB': 'Lebanon',
    
    # Cyprus
    'CY': 'Cyprus',
    
    # Rwanda
    'RW': 'Rwanda',
    
    # Armenia
    'AM': 'Armenia',
    
    # Ethiopia
    'ET': 'Ethiopia',
    
    # Mauritius
    'MU': 'Mauritius',
    
    # Bahrain
    'BH': 'Bahrain',
    
    # North Macedonia
    'MK': 'North Macedonia',
    
    # Albania
    'AL': 'Albania',
    
    # Moldova
    'MD': 'Moldova',
    
    # Montenegro
    'ME': 'Montenegro',
    
    # Togo
    'TG': 'Togo',
    
    # Azerbaijan
    'AZ': 'Azerbaijan',
    
    # Kuwait
    'KW': 'Kuwait',
    
    # Kyrgyzstan
    'KG': 'Kyrgyzstan',
    
    # Libya
    'LY': 'Libya',
    
    # Oman
    'OM': 'Oman',
    
    # Bosnia and Herzegovina
    'BA': 'Bosnia and Herzegovina',
    
    # Iceland
    'IS': 'Iceland',
    
    # Botswana
    'BW': 'Botswana',
    
    # Zambia
    'ZM': 'Zambia',
    
    # Tanzania
    'TZ': 'Tanzania',
    
    # Mozambique
    'MZ': 'Mozambique',
    
    # Angola
    'AO': 'Angola',
    
    # Ivory Coast
    'CI': 'Ivory Coast',
    
    # Iraq
    'IQ': 'Iraq',
    
    # Mauritania
    'MR': 'Mauritania',
    
    # Maldives
    'MV': 'Maldives',
    
    # Namibia
    'NA': 'Namibia',
    
    # Kosovo
    'XK': 'Kosovo',
    
    # Burkina Faso
    'BF': 'Burkina Faso',
    
    # Belarus
    'BY': 'Belarus',
    
    # Zambia
    'ZM': 'Zambia',
    
    # Malawi
    'MW': 'Malawi',
    
    # Democratic Republic of Congo
    'CD': 'Democratic Republic of Congo',
    'Congo, Republic of the': 'Republic of Congo',
    
    # Iran
    'IR': 'Iran',
    
    # Aruba
    'AW': 'Aruba',
    
    # Saint Kitts and Nevis
    'KN': 'Saint Kitts and Nevis',
    
    # Somalia
    'SO': 'Somalia',
    
    # Monaco
    'MC': 'Monaco',
    
    # Timor-Leste
    'TL': 'Timor-Leste',
    
    # Benin
    'BJ': 'Benin',
    
    # Madagascar
    'MG': 'Madagascar',
    
    # Bermuda
    'BM': 'Bermuda',
    
    # Cayman Islands
    'KY': 'Cayman Islands',
    
    # Palestine
    'PS': 'Palestine',
    
    # Andorra
    'AD': 'Andorra',
}

# Country to Region mapping (using normalized country names)
COUNTRY_TO_REGION = {
    # North America (AMER)
    'United States': 'AMER', 'Canada': 'AMER',
    
    # Latin America (LATAM)
    'Mexico': 'LATAM', 'Brazil': 'LATAM', 'Argentina': 'LATAM', 'Chile': 'LATAM',
    'Colombia': 'LATAM', 'Peru': 'LATAM', 'Venezuela': 'LATAM', 'Ecuador': 'LATAM',
    'Uruguay': 'LATAM', 'Paraguay': 'LATAM', 'Bolivia': 'LATAM', 'Costa Rica': 'LATAM',
    'Panama': 'LATAM', 'Dominican Republic': 'LATAM', 'Guatemala': 'LATAM',
    'Honduras': 'LATAM', 'El Salvador': 'LATAM', 'Nicaragua': 'LATAM',
    'Puerto Rico': 'LATAM', 'Jamaica': 'LATAM', 'Trinidad and Tobago': 'LATAM',
    'Cuba': 'LATAM', 'Haiti': 'LATAM', 'Bahamas': 'LATAM', 'Barbados': 'LATAM',
    
    # EMEA (Europe, Middle East, Africa)
    'United Kingdom': 'EMEA', 'Germany': 'EMEA', 'France': 'EMEA', 'Italy': 'EMEA',
    'Spain': 'EMEA', 'Netherlands': 'EMEA', 'Belgium': 'EMEA', 'Switzerland': 'EMEA',
    'Austria': 'EMEA', 'Sweden': 'EMEA', 'Norway': 'EMEA', 'Denmark': 'EMEA',
    'Finland': 'EMEA', 'Ireland': 'EMEA', 'Portugal': 'EMEA', 'Poland': 'EMEA',
    'Czech Republic': 'EMEA', 'Czechia': 'EMEA', 'Romania': 'EMEA', 'Hungary': 'EMEA',
    'Greece': 'EMEA', 'Ukraine': 'EMEA', 'Russia': 'EMEA', 'Turkey': 'EMEA',
    'Israel': 'EMEA', 'United Arab Emirates': 'EMEA', 'Saudi Arabia': 'EMEA',
    'South Africa': 'EMEA', 'Egypt': 'EMEA', 'Nigeria': 'EMEA', 'Kenya': 'EMEA',
    'Morocco': 'EMEA', 'Tunisia': 'EMEA', 'Ghana': 'EMEA', 'Luxembourg': 'EMEA',
    'Slovakia': 'EMEA', 'Bulgaria': 'EMEA', 'Croatia': 'EMEA', 'Slovenia': 'EMEA',
    'Serbia': 'EMEA', 'Lithuania': 'EMEA', 'Latvia': 'EMEA', 'Estonia': 'EMEA',
    # Additional EMEA countries
    'Uganda': 'EMEA', 'Zimbabwe': 'EMEA', 'Qatar': 'EMEA', 'Georgia': 'EMEA',
    'Malta': 'EMEA', 'Jordan': 'EMEA', 'Cameroon': 'EMEA', 'Senegal': 'EMEA',
    'Algeria': 'EMEA', 'Lebanon': 'EMEA', 'Cyprus': 'EMEA', 'Rwanda': 'EMEA',
    'Armenia': 'EMEA', 'Ethiopia': 'EMEA', 'Mauritius': 'EMEA', 'Bahrain': 'EMEA',
    'North Macedonia': 'EMEA', 'Albania': 'EMEA', 'Moldova': 'EMEA', 'Montenegro': 'EMEA',
    'Togo': 'EMEA', 'Azerbaijan': 'EMEA', 'Kuwait': 'EMEA', 'Libya': 'EMEA',
    'Oman': 'EMEA', 'Bosnia and Herzegovina': 'EMEA', 'Iceland': 'EMEA',
    'Botswana': 'EMEA', 'Zambia': 'EMEA', 'Tanzania': 'EMEA', 'Mozambique': 'EMEA',
    'Angola': 'EMEA', 'Ivory Coast': 'EMEA',
    # More EMEA countries
    'Iraq': 'EMEA', 'Mauritania': 'EMEA', 'Kosovo': 'EMEA', 'Burkina Faso': 'EMEA',
    'Belarus': 'EMEA', 'Malawi': 'EMEA', 'Democratic Republic of Congo': 'EMEA',
    'Republic of Congo': 'EMEA', 'Iran': 'EMEA', 'Somalia': 'EMEA', 'Monaco': 'EMEA',
    'Benin': 'EMEA', 'Madagascar': 'EMEA', 'Namibia': 'EMEA', 'Palestine': 'EMEA',
    'Andorra': 'EMEA',
    
    # APAC (Asia Pacific)
    'Japan': 'APAC', 'China': 'APAC', 'India': 'APAC', 'Australia': 'APAC',
    'South Korea': 'APAC', 'Korea': 'APAC', 'Singapore': 'APAC', 'Hong Kong': 'APAC',
    'Taiwan': 'APAC', 'Malaysia': 'APAC', 'Thailand': 'APAC', 'Indonesia': 'APAC',
    'Philippines': 'APAC', 'Vietnam': 'APAC', 'New Zealand': 'APAC', 'Pakistan': 'APAC',
    'Bangladesh': 'APAC', 'Sri Lanka': 'APAC', 'Nepal': 'APAC', 'Myanmar': 'APAC',
    'Cambodia': 'APAC', 'Laos': 'APAC', 'Mongolia': 'APAC',
    # Central Asia (often grouped with APAC or EMEA - using APAC)
    'Kazakhstan': 'APAC', 'Uzbekistan': 'APAC', 'Kyrgyzstan': 'APAC',
    # South Asia
    'Maldives': 'APAC', 'Timor-Leste': 'APAC',
    
    # Caribbean/LATAM additions
    'Aruba': 'LATAM', 'Saint Kitts and Nevis': 'LATAM', 'Bermuda': 'LATAM',
    'Cayman Islands': 'LATAM',
}

def normalize_country(country: str) -> str:
    """Normalize country name to standard form."""
    if not country:
        return country
    # Check exact match first
    if country in COUNTRY_NORMALIZATION:
        return COUNTRY_NORMALIZATION[country]
    # Check case-insensitive
    for key, value in COUNTRY_NORMALIZATION.items():
        if country.lower() == key.lower():
            return value
    return country

def get_region_from_country(country: str) -> str:
    """Get region from country name."""
    if not country:
        return 'Unknown'
    # Direct match
    if country in COUNTRY_TO_REGION:
        return COUNTRY_TO_REGION[country]
    # Case-insensitive match
    for c, r in COUNTRY_TO_REGION.items():
        if country.lower() == c.lower():
            return r
    return 'Other'

def main():
    # Read parquet
    print("Reading learners_enriched.parquet...")
    df = pq.read_table(DATA_DIR / 'learners_enriched.parquet').to_pandas()
    print(f"  Found {len(df):,} records")

    # Filter to certified users
    certified = df[df['exams_passed'] > 0].copy()
    total_certified = len(certified)
    print(f"  {total_certified:,} certified users")

    # Normalize country names
    certified['country_normalized'] = certified['country'].apply(normalize_country)
    
    # Always use our region mapping for known countries (to ensure LATAM split from AMER)
    def fix_region(row):
        # First check if we have a mapping for this country
        mapped_region = get_region_from_country(row['country_normalized'])
        if mapped_region != 'Other':
            return mapped_region
        # Fall back to original region if we don't have a mapping
        if row['region'] not in ('', None) and not pd.isna(row['region']):
            return row['region']
        return 'Other'
    
    certified['region_fixed'] = certified.apply(fix_region, axis=1)

    # Region breakdown (using fixed regions)
    region_stats = certified.groupby('region_fixed').agg({
        'exams_passed': ['count', 'sum']
    }).reset_index()
    region_stats.columns = ['region', 'certifiedUsers', 'totalCerts']
    region_stats['percentage'] = round(region_stats['certifiedUsers'] / total_certified * 100, 1)
    region_stats = region_stats.sort_values('certifiedUsers', ascending=False)

    # Country breakdown with region info - top 30 (using normalized names)
    country_region_stats = certified.groupby(['country_normalized', 'region_fixed']).agg({
        'exams_passed': ['count', 'sum']
    }).reset_index()
    country_region_stats.columns = ['country', 'region', 'certifiedUsers', 'totalCerts']
    country_region_stats['percentage'] = round(country_region_stats['certifiedUsers'] / total_certified * 100, 1)
    country_region_stats = country_region_stats[country_region_stats['country'].notna() & (country_region_stats['country'] != '')]
    country_region_stats = country_region_stats.nlargest(30, 'certifiedUsers')
    
    # Also create per-region country breakdowns
    countries_by_region = {}
    for region in certified['region_fixed'].unique():
        if pd.isna(region):
            continue
        region_df = certified[certified['region_fixed'] == region]
        region_country_stats = region_df.groupby('country_normalized').agg({
            'exams_passed': ['count', 'sum']
        }).reset_index()
        region_country_stats.columns = ['country', 'certifiedUsers', 'totalCerts']
        region_total = len(region_df)
        region_country_stats['percentage'] = round(region_country_stats['certifiedUsers'] / region_total * 100, 1)
        region_country_stats = region_country_stats[region_country_stats['country'].notna() & (region_country_stats['country'] != '')]
        region_country_stats = region_country_stats.nlargest(10, 'certifiedUsers')
        countries_by_region[region] = region_country_stats.to_dict('records')

    # Company breakdown - top 15
    company_stats = certified.groupby('company_name').agg({
        'exams_passed': ['count', 'sum']
    }).reset_index()
    company_stats.columns = ['company', 'certifiedUsers', 'totalCerts']
    company_stats['percentage'] = round(company_stats['certifiedUsers'] / total_certified * 100, 1)
    company_stats = company_stats[company_stats['company'].notna() & (company_stats['company'] != '')]
    company_stats = company_stats.nlargest(15, 'certifiedUsers')

    geo_data = {
        'regionBreakdown': region_stats.to_dict('records'),
        'topCountries': country_region_stats.to_dict('records'),
        'countriesByRegion': countries_by_region,
        'topCompanies': company_stats.to_dict('records'),
        'totalCertified': int(total_certified)
    }

    print(f"\nRegions (fixed): {len(geo_data['regionBreakdown'])}")
    for r in geo_data['regionBreakdown']:
        print(f"  {r['region']}: {r['certifiedUsers']:,} ({r['percentage']}%)")

    print(f"\nTop Countries (with region): {len(geo_data['topCountries'])}")
    for c in geo_data['topCountries'][:5]:
        print(f"  {c['country']} ({c['region']}): {c['certifiedUsers']:,} ({c['percentage']}%)")
    
    print(f"\nCountries by Region:")
    for region, countries in countries_by_region.items():
        print(f"  {region}: {len(countries)} countries")

    print(f"\nTop Companies: {len(geo_data['topCompanies'])}")
    for c in geo_data['topCompanies'][:5]:
        print(f"  {c['company']}: {c['certifiedUsers']:,} ({c['percentage']}%)")

    # Load existing metrics.json and add geographic data
    metrics_path = DATA_DIR / 'aggregated' / 'metrics.json'
    with open(metrics_path, 'r') as f:
        metrics = json.load(f)

    metrics['certificationAnalytics']['geographicBreakdown'] = geo_data

    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)

    print("\n✅ Updated metrics.json with geographicBreakdown")

if __name__ == "__main__":
    main()
