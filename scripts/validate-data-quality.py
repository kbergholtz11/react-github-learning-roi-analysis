#!/usr/bin/env python3
"""
Data Quality Validation Script

Validates data quality after syncs and creates GitHub issues when checks fail.
Follows patterns from: https://github.com/github/data/blob/master/docs/data%20quality%20checks%20(via%20DAG).md

Usage:
  python scripts/validate-data-quality.py [--create-issues] [--verbose]

Options:
  --create-issues  Create GitHub issues for failed checks
  --verbose        Show detailed output for each check

Quality Checks:
  1. Completeness: No null values in required fields
  2. Validity: Values are within expected ranges
  3. Freshness: Data was updated recently
  4. Consistency: Cross-field relationships are valid
  5. Coverage: Fill rates meet thresholds
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import pandas as pd

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data"
LEARNERS_FILE = DATA_DIR / "learners_enriched.parquet"
SYNC_STATUS_FILE = DATA_DIR / "sync_status.json"
QUALITY_REPORT_FILE = DATA_DIR / "quality_report.json"

# Thresholds
FILL_RATE_THRESHOLDS = {
    "dotcom_id": 1.0,        # Required - must be 100%
    "email": 0.95,           # Should have 95%+ emails
    "company": 0.60,         # Aim for 60%+ company attribution
    "region": 0.70,          # 70%+ region coverage
    "country": 0.50,         # 50%+ country coverage
    "org_name": 0.40,        # 40%+ org membership
}

# Freshness thresholds (hours since last update)
FRESHNESS_THRESHOLDS = {
    "canonical": 24,    # Canonical data should be <24h old
    "hydro": 4,         # Hydro data should be <4h old
    "ace": 24,          # ACE data should be <24h old
}


@dataclass
class QualityCheck:
    """Represents a data quality check."""
    name: str
    description: str
    category: str  # completeness, validity, freshness, consistency, coverage
    check_fn: Callable[..., Tuple[bool, str, Dict[str, Any]]]
    severity: str = "warning"  # error, warning, info
    threshold: Optional[float] = None


@dataclass
class CheckResult:
    """Result of a quality check."""
    name: str
    passed: bool
    message: str
    severity: str
    category: str
    details: Dict[str, Any]
    timestamp: datetime


def log(msg: str, level: str = "info"):
    """Print a log message with timestamp."""
    icons = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "error": "❌", "check": "🔍"}
    icon = icons.get(level, "•")
    print(f"{icon} [{datetime.now().strftime('%H:%M:%S')}] {msg}")


def load_learners() -> Optional[pd.DataFrame]:
    """Load learner data from parquet file."""
    if LEARNERS_FILE.exists():
        return pd.read_parquet(LEARNERS_FILE)
    
    # Fallback to CSV
    csv_file = DATA_DIR / "learners_enriched.csv"
    if csv_file.exists():
        return pd.read_csv(csv_file)
    
    return None


def load_sync_status() -> Optional[Dict[str, Any]]:
    """Load sync status from JSON file."""
    if SYNC_STATUS_FILE.exists():
        with open(SYNC_STATUS_FILE) as f:
            return json.load(f)
    return None


# =============================================================================
# COMPLETENESS CHECKS
# =============================================================================

def check_no_null_dotcom_ids(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that all records have a dotcom_id."""
    null_count = df["dotcom_id"].isna().sum()
    total = len(df)
    passed = null_count == 0
    
    return (
        passed,
        f"Found {null_count:,} records with null dotcom_id out of {total:,}",
        {"null_count": int(null_count), "total": total, "null_rate": null_count / total if total > 0 else 0}
    )


def check_no_null_emails(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check email fill rate meets threshold."""
    null_count = df["email"].isna().sum() if "email" in df.columns else len(df)
    total = len(df)
    fill_rate = 1 - (null_count / total) if total > 0 else 0
    threshold = FILL_RATE_THRESHOLDS.get("email", 0.95)
    passed = fill_rate >= threshold
    
    return (
        passed,
        f"Email fill rate: {fill_rate:.1%} (threshold: {threshold:.0%})",
        {"fill_rate": fill_rate, "threshold": threshold, "null_count": int(null_count)}
    )


# =============================================================================
# VALIDITY CHECKS
# =============================================================================

def check_valid_dates(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that certification dates are valid (not in the future)."""
    date_cols = ["certification_date", "first_certification_date", "latest_certification_date"]
    issues = {}
    
    for col in date_cols:
        if col in df.columns:
            try:
                dates = pd.to_datetime(df[col], errors="coerce")
                future_count = (dates > datetime.now()).sum()
                if future_count > 0:
                    issues[col] = int(future_count)
            except Exception:
                pass
    
    passed = len(issues) == 0
    return (
        passed,
        f"Found {sum(issues.values())} records with future dates" if issues else "All dates are valid",
        {"future_dates_by_column": issues}
    )


def check_valid_regions(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that region values are valid."""
    valid_regions = {"AMER", "EMEA", "APAC", None, ""}
    
    if "region" not in df.columns:
        return (True, "No region column found", {})
    
    regions = df["region"].dropna().unique()
    invalid = [r for r in regions if r not in valid_regions]
    passed = len(invalid) == 0
    
    return (
        passed,
        f"Found {len(invalid)} invalid region values: {invalid[:5]}" if invalid else "All regions are valid",
        {"invalid_regions": invalid[:10], "valid_regions": list(valid_regions - {None, ""})}
    )


def check_certification_counts(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that certification counts are reasonable."""
    if "certification_count" not in df.columns:
        return (True, "No certification_count column found", {})
    
    # Check for negative values
    negative = (df["certification_count"] < 0).sum()
    # Check for unreasonably high values (>20 certs seems unlikely)
    high = (df["certification_count"] > 20).sum()
    
    passed = negative == 0
    return (
        passed,
        f"Found {negative} negative and {high} unusually high certification counts",
        {"negative_count": int(negative), "high_count": int(high), "max_value": int(df["certification_count"].max())}
    )


# =============================================================================
# FRESHNESS CHECKS
# =============================================================================

def check_data_freshness(sync_status: Optional[Dict[str, Any]]) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that data was synced recently."""
    if not sync_status:
        return (False, "No sync status found", {"last_sync": None})
    
    last_sync_str = sync_status.get("last_sync") or sync_status.get("timestamp")
    if not last_sync_str:
        return (False, "No last sync timestamp found", {"last_sync": None})
    
    try:
        last_sync = datetime.fromisoformat(last_sync_str.replace("Z", "+00:00"))
        hours_old = (datetime.now(last_sync.tzinfo) - last_sync).total_seconds() / 3600
        
        # Use canonical threshold (24 hours)
        threshold = FRESHNESS_THRESHOLDS.get("canonical", 24)
        passed = hours_old <= threshold
        
        return (
            passed,
            f"Data is {hours_old:.1f} hours old (threshold: {threshold}h)",
            {"hours_old": hours_old, "threshold": threshold, "last_sync": last_sync_str}
        )
    except Exception as e:
        return (False, f"Error parsing sync timestamp: {e}", {"error": str(e)})


def check_file_freshness(file_path: Path, max_hours: int = 24) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that a file was modified recently."""
    if not file_path.exists():
        return (False, f"File not found: {file_path.name}", {"exists": False})
    
    mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
    hours_old = (datetime.now() - mtime).total_seconds() / 3600
    passed = hours_old <= max_hours
    
    return (
        passed,
        f"{file_path.name} is {hours_old:.1f} hours old (threshold: {max_hours}h)",
        {"hours_old": hours_old, "threshold": max_hours, "modified": mtime.isoformat()}
    )


# =============================================================================
# CONSISTENCY CHECKS
# =============================================================================

def check_certification_consistency(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that certification fields are consistent."""
    issues = []
    
    # Users with certifications should have a certification date
    if "certification_count" in df.columns and "first_certification_date" in df.columns:
        has_certs = df["certification_count"] > 0
        has_date = df["first_certification_date"].notna()
        inconsistent = (has_certs & ~has_date).sum()
        if inconsistent > 0:
            issues.append(f"{inconsistent} users with certs but no date")
    
    # Certification count should match unique cert types
    cert_cols = [c for c in df.columns if c.startswith("is_") and "certified" in c.lower()]
    if cert_cols and "certification_count" in df.columns:
        cert_sum = df[cert_cols].sum(axis=1)
        mismatch = (df["certification_count"] != cert_sum).sum()
        if mismatch > 0:
            issues.append(f"{mismatch} users with mismatched cert counts")
    
    passed = len(issues) == 0
    return (
        passed,
        "; ".join(issues) if issues else "Certification data is consistent",
        {"issues": issues}
    )


def check_company_hierarchy(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that company attribution hierarchy is consistent."""
    # Users with salesforce_account should typically have customer_name
    company_cols = ["customer_name", "salesforce_account_name", "company"]
    available_cols = [c for c in company_cols if c in df.columns]
    
    if len(available_cols) < 2:
        return (True, "Insufficient company columns to check hierarchy", {})
    
    # Check that customer_name is preferred when available
    if "customer_name" in df.columns and "company" in df.columns:
        has_customer = df["customer_name"].notna()
        company_matches = df["company"] == df["customer_name"]
        mismatch = (has_customer & ~company_matches).sum()
        
        passed = mismatch == 0
        return (
            passed,
            f"{mismatch} records where company doesn't match customer_name",
            {"mismatch_count": int(mismatch)}
        )
    
    return (True, "Company hierarchy check passed", {})


# =============================================================================
# COVERAGE CHECKS
# =============================================================================

def check_field_fill_rates(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check fill rates for key fields."""
    results = {}
    failures = []
    
    for field, threshold in FILL_RATE_THRESHOLDS.items():
        if field in df.columns:
            fill_rate = df[field].notna().mean()
            results[field] = {"fill_rate": fill_rate, "threshold": threshold, "passed": fill_rate >= threshold}
            if fill_rate < threshold:
                failures.append(f"{field}: {fill_rate:.1%} (need {threshold:.0%})")
    
    passed = len(failures) == 0
    return (
        passed,
        "; ".join(failures) if failures else "All field fill rates meet thresholds",
        {"fill_rates": results}
    )


def check_product_usage_coverage(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check that product usage data has reasonable coverage."""
    usage_cols = ["copilot_active", "actions_active", "codespaces_active", "has_product_usage"]
    available = [c for c in usage_cols if c in df.columns]
    
    if not available:
        return (True, "No product usage columns found", {"available_columns": []})
    
    results = {}
    for col in available:
        if df[col].dtype == bool:
            coverage = df[col].mean()
        else:
            coverage = df[col].notna().mean()
        results[col] = coverage
    
    # At least 10% of learners should have some product usage data
    overall_coverage = results.get("has_product_usage", max(results.values()) if results else 0)
    passed = overall_coverage >= 0.10
    
    return (
        passed,
        f"Product usage coverage: {overall_coverage:.1%}",
        {"coverage_by_column": results}
    )


# =============================================================================
# ANOMALY DETECTION
# =============================================================================

def check_record_count_anomaly(df: pd.DataFrame, sync_status: Optional[Dict[str, Any]]) -> Tuple[bool, str, Dict[str, Any]]:
    """Check for unusual changes in record count."""
    current_count = len(df)
    
    if not sync_status or "record_count" not in sync_status:
        return (True, f"Current record count: {current_count:,}", {"current": current_count})
    
    previous_count = sync_status.get("record_count", 0)
    if previous_count == 0:
        return (True, f"Current record count: {current_count:,}", {"current": current_count})
    
    change_pct = (current_count - previous_count) / previous_count
    
    # Flag if count changed by more than 20%
    passed = abs(change_pct) <= 0.20
    
    return (
        passed,
        f"Record count changed by {change_pct:+.1%} ({previous_count:,} → {current_count:,})",
        {"current": current_count, "previous": previous_count, "change_pct": change_pct}
    )


def check_certification_distribution(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """Check for anomalies in certification distribution."""
    cert_cols = [c for c in df.columns if c.startswith("is_") and "certified" in c.lower()]
    
    if not cert_cols:
        return (True, "No certification columns found", {})
    
    distribution = {}
    for col in cert_cols:
        if df[col].dtype == bool:
            distribution[col] = df[col].sum()
        else:
            distribution[col] = (df[col] == True).sum() if df[col].notna().any() else 0
    
    # Check if any single cert type dominates (>80% of all certs)
    total = sum(distribution.values())
    if total > 0:
        max_pct = max(distribution.values()) / total
        passed = max_pct <= 0.80
    else:
        passed = True
    
    return (
        passed,
        f"Certification distribution across {len(cert_cols)} types",
        {"distribution": distribution, "total_certifications": total}
    )


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def build_quality_checks() -> List[QualityCheck]:
    """Build the list of quality checks to run."""
    return [
        # Completeness
        QualityCheck("no_null_dotcom_ids", "All records must have a dotcom_id", "completeness", check_no_null_dotcom_ids, "error"),
        QualityCheck("email_fill_rate", "Email fill rate meets threshold", "completeness", check_no_null_emails, "warning"),
        
        # Validity
        QualityCheck("valid_dates", "All dates are valid (not in future)", "validity", check_valid_dates, "error"),
        QualityCheck("valid_regions", "Region values are valid", "validity", check_valid_regions, "warning"),
        QualityCheck("valid_cert_counts", "Certification counts are reasonable", "validity", check_certification_counts, "warning"),
        
        # Consistency
        QualityCheck("cert_consistency", "Certification fields are consistent", "consistency", check_certification_consistency, "warning"),
        QualityCheck("company_hierarchy", "Company attribution is consistent", "consistency", check_company_hierarchy, "info"),
        
        # Coverage
        QualityCheck("field_fill_rates", "Key field fill rates meet thresholds", "coverage", check_field_fill_rates, "warning"),
        QualityCheck("product_usage_coverage", "Product usage data coverage", "coverage", check_product_usage_coverage, "info"),
        
        # Anomaly Detection
        QualityCheck("cert_distribution", "Certification distribution is balanced", "anomaly", check_certification_distribution, "info"),
    ]


def run_quality_checks(verbose: bool = False) -> Tuple[List[CheckResult], bool]:
    """Run all quality checks and return results."""
    results: List[CheckResult] = []
    
    # Load data
    log("Loading learner data...", "check")
    df = load_learners()
    if df is None:
        log("No learner data found!", "error")
        return results, False
    
    log(f"Loaded {len(df):,} learner records", "info")
    
    sync_status = load_sync_status()
    
    # Build and run checks
    checks = build_quality_checks()
    
    for check in checks:
        try:
            if check.name == "record_count_anomaly":
                passed, message, details = check_record_count_anomaly(df, sync_status)
            else:
                passed, message, details = check.check_fn(df)
            
            result = CheckResult(
                name=check.name,
                passed=passed,
                message=message,
                severity=check.severity,
                category=check.category,
                details=details,
                timestamp=datetime.now()
            )
            results.append(result)
            
            # Log result
            level = "success" if passed else ("error" if check.severity == "error" else "warning")
            log(f"[{check.category.upper()}] {check.description}: {message}", level)
            
            if verbose and details:
                for key, value in details.items():
                    print(f"    {key}: {value}")
                    
        except Exception as e:
            log(f"Error running check '{check.name}': {e}", "error")
            results.append(CheckResult(
                name=check.name,
                passed=False,
                message=f"Check failed with error: {e}",
                severity="error",
                category=check.category,
                details={"error": str(e)},
                timestamp=datetime.now()
            ))
    
    # Add freshness checks
    log("Running freshness checks...", "check")
    
    # Data freshness
    passed, message, details = check_data_freshness(sync_status)
    results.append(CheckResult("data_freshness", passed, message, "warning", "freshness", details, datetime.now()))
    log(f"[FRESHNESS] {message}", "success" if passed else "warning")
    
    # File freshness
    passed, message, details = check_file_freshness(LEARNERS_FILE, max_hours=24)
    results.append(CheckResult("file_freshness", passed, message, "warning", "freshness", details, datetime.now()))
    log(f"[FRESHNESS] {message}", "success" if passed else "warning")
    
    # Record count anomaly
    passed, message, details = check_record_count_anomaly(df, sync_status)
    results.append(CheckResult("record_count_anomaly", passed, message, "warning", "anomaly", details, datetime.now()))
    log(f"[ANOMALY] {message}", "success" if passed else "warning")
    
    # Calculate overall pass rate
    total = len(results)
    passed_count = sum(1 for r in results if r.passed)
    error_count = sum(1 for r in results if not r.passed and r.severity == "error")
    
    log(f"\nQuality Report: {passed_count}/{total} checks passed", "info")
    
    overall_passed = error_count == 0
    return results, overall_passed


def generate_report(results: List[CheckResult]) -> Dict[str, Any]:
    """Generate a quality report from check results."""
    return {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_checks": len(results),
            "passed": sum(1 for r in results if r.passed),
            "failed": sum(1 for r in results if not r.passed),
            "errors": sum(1 for r in results if not r.passed and r.severity == "error"),
            "warnings": sum(1 for r in results if not r.passed and r.severity == "warning"),
        },
        "checks": [
            {
                "name": r.name,
                "passed": r.passed,
                "message": r.message,
                "severity": r.severity,
                "category": r.category,
                "details": r.details,
                "timestamp": r.timestamp.isoformat(),
            }
            for r in results
        ],
        "by_category": {
            category: {
                "passed": sum(1 for r in results if r.category == category and r.passed),
                "failed": sum(1 for r in results if r.category == category and not r.passed),
            }
            for category in set(r.category for r in results)
        }
    }


def save_report(report: Dict[str, Any]):
    """Save quality report to file."""
    with open(QUALITY_REPORT_FILE, "w") as f:
        json.dump(report, f, indent=2)
    log(f"Quality report saved to {QUALITY_REPORT_FILE}", "success")


def create_github_issue(results: List[CheckResult]) -> bool:
    """Create a GitHub issue for failed checks (if GITHUB_TOKEN is available)."""
    failed = [r for r in results if not r.passed and r.severity in ("error", "warning")]
    
    if not failed:
        log("No failed checks to report", "info")
        return True
    
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        log("GITHUB_TOKEN not set, skipping issue creation", "warning")
        return False
    
    # Build issue body
    title = f"[Data Quality] {len(failed)} checks failed - {datetime.now().strftime('%Y-%m-%d')}"
    
    body_lines = [
        "## Data Quality Check Failures\n",
        f"**Date**: {datetime.now().isoformat()}",
        f"**Total Checks**: {len(results)}",
        f"**Failed**: {len(failed)}\n",
        "### Failed Checks\n",
    ]
    
    for result in failed:
        emoji = "🔴" if result.severity == "error" else "🟡"
        body_lines.append(f"- {emoji} **{result.name}** ({result.category}): {result.message}")
    
    body_lines.append("\n### Details\n")
    body_lines.append("```json")
    body_lines.append(json.dumps([{"name": r.name, "details": r.details} for r in failed], indent=2))
    body_lines.append("```")
    
    body = "\n".join(body_lines)
    
    # Create issue via GitHub API
    try:
        import requests
        
        repo = os.environ.get("GITHUB_REPOSITORY", "kbergholtz11/react-github-learning-roi-analysis")
        url = f"https://api.github.com/repos/{repo}/issues"
        
        response = requests.post(
            url,
            headers={
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github.v3+json",
            },
            json={
                "title": title,
                "body": body,
                "labels": ["data-quality", "automated"],
            }
        )
        
        if response.status_code == 201:
            issue_url = response.json().get("html_url")
            log(f"Created issue: {issue_url}", "success")
            return True
        else:
            log(f"Failed to create issue: {response.status_code} - {response.text}", "error")
            return False
            
    except Exception as e:
        log(f"Error creating GitHub issue: {e}", "error")
        return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Validate data quality")
    parser.add_argument("--create-issues", action="store_true", help="Create GitHub issues for failed checks")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    args = parser.parse_args()
    
    log("Starting data quality validation...", "info")
    
    # Run checks
    results, overall_passed = run_quality_checks(verbose=args.verbose)
    
    if not results:
        log("No checks were run!", "error")
        sys.exit(1)
    
    # Generate and save report
    report = generate_report(results)
    save_report(report)
    
    # Create GitHub issue if requested and checks failed
    if args.create_issues and not overall_passed:
        create_github_issue(results)
    
    # Exit with appropriate code
    if not overall_passed:
        log("Data quality validation FAILED - errors found", "error")
        sys.exit(1)
    else:
        log("Data quality validation PASSED", "success")
        sys.exit(0)


if __name__ == "__main__":
    main()
