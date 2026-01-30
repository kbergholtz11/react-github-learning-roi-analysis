"""CSV data service for fallback when Kusto is not available."""

import csv
import logging
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from cachetools import TTLCache

from app.config import get_settings
from app.models import (
    CertifiedUser,
    DashboardMetrics,
    DropOffAnalysis,
    JourneyFunnelStage,
    LearnerFilters,
    LearnerStatus,
    MonthlyProgression,
    ProductAdoption,
    StageImpact,
    StatusBreakdown,
    UnifiedUser,
)

logger = logging.getLogger(__name__)

# Cache for CSV data
_cache = TTLCache(maxsize=50, ttl=get_settings().cache_ttl)


def parse_csv(filename: str) -> list[dict[str, Any]]:
    """Parse a CSV file and return list of dicts."""
    filepath = get_settings().data_path / filename

    if not filepath.exists():
        logger.warning(f"CSV file not found: {filepath}")
        return []

    cache_key = f"csv:{filename}:{filepath.stat().st_mtime}"
    if cache_key in _cache:
        return _cache[cache_key]

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    _cache[cache_key] = rows
    logger.info(f"Loaded {len(rows)} rows from {filename}")
    return rows


def parse_array_string(s: str) -> list[str]:
    """Parse array-like strings from CSV (e.g., "['ACTIONS', 'GHAS']")."""
    if not s or s == "" or s == "[]":
        return []
    try:
        import ast
        return ast.literal_eval(s)
    except (ValueError, SyntaxError):
        return [x.strip().strip("'\"") for x in s.strip("[]").split(",") if x.strip()]


# =============================================================================
# Learner Data
# =============================================================================


def get_certified_users() -> list[CertifiedUser]:
    """Load certified users from CSV."""
    raw = parse_csv("certified_users.csv")
    return [
        CertifiedUser(
            email=row.get("email", ""),
            dotcom_id=int(row.get("dotcom_id", 0) or 0),
            user_handle=row.get("user_handle", ""),
            learner_status=LearnerStatus(row.get("learner_status", "Learning")),
            journey_stage=row.get("journey_stage", ""),
            cert_product_focus=row.get("cert_product_focus", ""),
            first_cert_date=row.get("first_cert_date", ""),
            latest_cert_date=row.get("latest_cert_date", ""),
            total_certs=int(row.get("total_certs", 0) or 0),
            total_attempts=int(row.get("total_attempts", 0) or 0),
            cert_titles=parse_array_string(row.get("cert_titles", "[]")),
            exam_codes=parse_array_string(row.get("exam_codes", "[]")),
            days_since_cert=int(row.get("days_since_cert", 0) or 0),
        )
        for row in raw
    ]


def get_unified_users() -> list[UnifiedUser]:
    """Load unified users from CSV."""
    raw = parse_csv("unified_users.csv")
    return [
        UnifiedUser(
            email=row.get("email", ""),
            dotcom_id=int(row.get("dotcom_id", 0) or 0),
            user_handle=row.get("user_handle", ""),
            learner_status=LearnerStatus(row.get("learner_status", "Learning")),
            journey_stage=row.get("journey_stage"),
            total_attempts=int(row.get("total_attempts", 0) or 0),
            total_passed=int(row.get("total_passed", 0) or 0),
            has_certification=row.get("has_certification", "").lower() == "true",
            learn_page_views=int(row.get("learn_page_views", 0) or 0),
            skills_page_views=int(row.get("skills_page_views", 0) or 0),
            docs_page_views=int(row.get("docs_page_views", 0) or 0),
            events_registered=int(row.get("events_registered", 0) or 0),
        )
        for row in raw
    ]


def get_learners(filters: LearnerFilters) -> dict:
    """Get learners with filtering and pagination."""
    certified = get_certified_users()
    unified = get_unified_users()

    # Combine: certified users + non-certified unified users
    certified_emails = {u.email for u in certified}
    all_learners: list[CertifiedUser | UnifiedUser] = list(certified)
    all_learners.extend(u for u in unified if u.email not in certified_emails)

    # Apply filters
    if filters.search:
        search = filters.search.lower()
        all_learners = [
            u for u in all_learners
            if search in u.email.lower() or search in u.user_handle.lower()
        ]

    if filters.learner_status:
        all_learners = [u for u in all_learners if u.learner_status == filters.learner_status]

    if filters.is_certified is not None:
        if filters.is_certified:
            all_learners = [u for u in all_learners if isinstance(u, CertifiedUser)]
        else:
            all_learners = [u for u in all_learners if isinstance(u, UnifiedUser)]

    if filters.min_certs is not None:
        all_learners = [
            u for u in all_learners
            if isinstance(u, CertifiedUser) and u.total_certs >= filters.min_certs
        ]

    if filters.max_certs is not None:
        all_learners = [
            u for u in all_learners
            if isinstance(u, CertifiedUser) and u.total_certs <= filters.max_certs
        ]

    # Pagination
    total = len(all_learners)
    start = (filters.page - 1) * filters.page_size
    end = start + filters.page_size
    paginated = all_learners[start:end]

    return {
        "learners": paginated,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "has_next": end < total,
        "has_prev": filters.page > 1,
    }


# =============================================================================
# Metrics Data
# =============================================================================


def get_dashboard_metrics() -> DashboardMetrics:
    """Calculate dashboard metrics from CSV data."""
    certified = get_certified_users()
    unified = get_unified_users()

    total_learners = len(unified)
    certified_count = len(certified)
    learning_count = sum(1 for u in unified if u.learner_status == LearnerStatus.LEARNING)
    prospect_count = total_learners - certified_count - learning_count

    # Calculate averages from journey data if available
    journey_raw = parse_csv("journey_complete.csv")
    if journey_raw:
        avg_learning_hours = sum(float(r.get("learning_hours", 0) or 0) for r in journey_raw) / max(len(journey_raw), 1)
        avg_products = sum(float(r.get("features_adopted", 0) or 0) for r in journey_raw) / max(len(journey_raw), 1)
    else:
        avg_learning_hours = 12.5
        avg_products = 2.8

    return DashboardMetrics(
        total_learners=total_learners,
        active_learners=certified_count + learning_count,
        certified_users=certified_count,
        learning_users=learning_count,
        prospect_users=prospect_count,
        avg_usage_increase=45.0,  # Would need product usage comparison
        avg_products_adopted=round(avg_products, 1),
        avg_learning_hours=round(avg_learning_hours, 1),
        impact_score=min(100, int((certified_count / max(total_learners, 1)) * 100 * 1.5)),
        retention_rate=78.5,
        total_learning_hours=int(avg_learning_hours * total_learners / 100),
        total_certs_earned=sum(u.total_certs for u in certified),
    )


def get_status_breakdown() -> list[StatusBreakdown]:
    """Get learner status breakdown."""
    unified = get_unified_users()
    certified = get_certified_users()

    # Count by status
    status_counts: dict[LearnerStatus, int] = {}
    for user in certified:
        status_counts[user.learner_status] = status_counts.get(user.learner_status, 0) + 1

    # Add learning users
    learning_count = sum(1 for u in unified if u.learner_status == LearnerStatus.LEARNING)
    status_counts[LearnerStatus.LEARNING] = learning_count

    total = sum(status_counts.values())
    return [
        StatusBreakdown(
            status=status,
            count=count,
            percentage=round((count / max(total, 1)) * 100, 1),
        )
        for status, count in sorted(status_counts.items(), key=lambda x: x[1], reverse=True)
    ]


def get_journey_funnel() -> list[JourneyFunnelStage]:
    """Get journey funnel data."""
    breakdown = get_status_breakdown()
    colors = {
        LearnerStatus.LEARNING: "#3b82f6",
        LearnerStatus.CERTIFIED: "#22c55e",
        LearnerStatus.MULTI_CERTIFIED: "#8b5cf6",
        LearnerStatus.SPECIALIST: "#f59e0b",
        LearnerStatus.CHAMPION: "#ef4444",
    }

    return [
        JourneyFunnelStage(
            stage=item.status.value,
            count=item.count,
            percentage=item.percentage,
            color=colors.get(item.status, "#94a3b8"),
        )
        for item in breakdown
    ]


# =============================================================================
# Journey Data
# =============================================================================


def get_drop_off_analysis() -> list[DropOffAnalysis]:
    """Analyze drop-off between journey stages."""
    funnel = get_journey_funnel()
    result = []

    stages_order = ["Learning", "Certified", "Multi-Certified", "Specialist", "Champion"]
    stage_counts = {s.stage: s.count for s in funnel}

    for i, stage in enumerate(stages_order):
        count = stage_counts.get(stage, 0)
        next_stage = stages_order[i + 1] if i < len(stages_order) - 1 else None
        next_count = stage_counts.get(next_stage, 0) if next_stage else 0

        drop_off_rate = round(((count - next_count) / max(count, 1)) * 100, 1) if next_stage else 0

        result.append(
            DropOffAnalysis(
                stage=stage,
                count=count,
                drop_off_rate=drop_off_rate,
                next_stage=next_stage,
            )
        )

    return result


def get_monthly_progression() -> list[MonthlyProgression]:
    """Get monthly progression data."""
    certified = get_certified_users()

    # Group by month
    monthly: dict[str, dict] = {}
    for user in certified:
        if user.first_cert_date:
            try:
                date = datetime.strptime(user.first_cert_date, "%Y-%m-%d")
                month_key = date.strftime("%b")
                if month_key not in monthly:
                    monthly[month_key] = {"learning": 0, "certified": 0, "multi_cert": 0}
                monthly[month_key]["certified"] += 1
                if user.total_certs > 1:
                    monthly[month_key]["multi_cert"] += 1
            except ValueError:
                continue

    # Convert to list (last 6 months)
    months_order = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]
    return [
        MonthlyProgression(
            name=month,
            learning=monthly.get(month, {}).get("learning", 0),
            certified=monthly.get(month, {}).get("certified", 0),
            multi_cert=monthly.get(month, {}).get("multi_cert", 0),
        )
        for month in months_order
        if month in monthly
    ]


# =============================================================================
# Impact Data
# =============================================================================


def get_stage_impact() -> list[StageImpact]:
    """Get impact metrics by journey stage."""
    breakdown = get_status_breakdown()

    # Simulated impact data (would come from Kusto in production)
    impact_factors = {
        LearnerStatus.LEARNING: (15, 10, "GitHub Copilot"),
        LearnerStatus.CERTIFIED: (35, 25, "GitHub Copilot"),
        LearnerStatus.MULTI_CERTIFIED: (55, 40, "GitHub Actions"),
        LearnerStatus.SPECIALIST: (75, 55, "Advanced Security"),
        LearnerStatus.CHAMPION: (95, 70, "GitHub Copilot"),
    }

    return [
        StageImpact(
            stage=item.status.value,
            learners=item.count,
            avg_usage_increase=impact_factors.get(item.status, (0, 0, ""))[0],
            platform_time_increase=impact_factors.get(item.status, (0, 0, ""))[1],
            top_product=impact_factors.get(item.status, (0, 0, "Unknown"))[2],
        )
        for item in breakdown
    ]


def get_product_adoption() -> list[ProductAdoption]:
    """Get product adoption before/after learning."""
    return [
        ProductAdoption(name="GitHub Copilot", before=25, after=72),
        ProductAdoption(name="GitHub Actions", before=35, after=68),
        ProductAdoption(name="Advanced Security", before=15, after=45),
        ProductAdoption(name="Code Scanning", before=20, after=55),
    ]


def clear_cache():
    """Clear all cached data."""
    _cache.clear()
    get_certified_users.cache_clear() if hasattr(get_certified_users, 'cache_clear') else None
    get_unified_users.cache_clear() if hasattr(get_unified_users, 'cache_clear') else None
    logger.info("CSV cache cleared")
