"""
Skill Journey Service

Combines data from multiple sources to calculate skill scores for all learners.
"""

import logging
from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional

from app.config import get_settings
from app.csv_service import parse_csv, parse_array_string, parse_cert_titles
from app.skill_journey import (
    SkillLevel,
    SkillDimension,
    SkillProfile,
    SkillFunnelStage,
    SkillJourneyResponse,
    calculate_skill_score,
    get_skill_level_info,
    DEFAULT_WEIGHTS,
)

logger = logging.getLogger(__name__)


def get_learning_activity_map() -> Dict[str, Dict[str, Any]]:
    """Load learning activity data indexed by user_ref."""
    rows = parse_csv("learning_activity.csv")
    result = {}
    
    for row in rows:
        user_ref = row.get("user_ref", "").strip()
        if user_ref:
            result[user_ref] = {
                "page_views": int(row.get("page_views", 0) or 0),
                "learning_sessions": int(row.get("learning_sessions", 0) or 0),
                "learning_days": int(row.get("learning_days", 0) or 0),
                "learning_hours": float(row.get("learning_hours", 0) or 0),
                "first_learning": row.get("first_learning", ""),
                "last_learning": row.get("last_learning", ""),
            }
    
    logger.info(f"Loaded learning activity for {len(result)} users")
    return result


def get_product_usage_map() -> Dict[int, Dict[str, Any]]:
    """Load product usage data indexed by dotcom_id."""
    rows = parse_csv("product_usage.csv")
    result = {}
    
    for row in rows:
        try:
            dotcom_id = int(row.get("dotcom_id", 0))
            if dotcom_id:
                result[dotcom_id] = {
                    "activity_days": int(row.get("activity_days", 0) or 0),
                    "copilot_events": int(row.get("copilot_events", 0) or 0),
                    "copilot_days": int(row.get("copilot_days", 0) or 0),
                    "actions_events": int(row.get("actions_events", 0) or 0),
                    "security_events": int(row.get("security_events", 0) or 0),
                    "total_events": int(row.get("total_events", 0) or 0),
                    "product_usage_hours": float(row.get("product_usage_hours", 0) or 0),
                }
        except (ValueError, TypeError):
            continue
    
    logger.info(f"Loaded product usage for {len(result)} users")
    return result


def get_certified_users_map() -> Dict[str, Dict[str, Any]]:
    """Load certified users data indexed by user_handle."""
    rows = parse_csv("certified_users.csv")
    result = {}
    
    for row in rows:
        handle = row.get("user_handle", "").strip()
        if handle:
            # Parse certification dates
            first_cert = row.get("first_cert_date", "")
            days_since_cert = 0
            if first_cert:
                try:
                    cert_date = datetime.strptime(first_cert[:10], "%Y-%m-%d")
                    days_since_cert = (datetime.now() - cert_date).days
                except ValueError:
                    pass
            
            result[handle] = {
                "dotcom_id": int(row.get("dotcom_id", 0) or 0),
                "total_certs": int(row.get("total_certs", 0) or 0),
                "total_attempts": int(row.get("total_attempts", 0) or 0),
                "cert_titles": parse_cert_titles(row.get("cert_titles", "[]")),
                "first_cert_date": first_cert,
                "days_since_cert": days_since_cert,
            }
    
    logger.info(f"Loaded certification data for {len(result)} users")
    return result


def calculate_days_since(date_str: str) -> int:
    """Calculate days since a date string."""
    if not date_str:
        return 999  # Very old
    
    try:
        # Handle various date formats
        date_str = date_str.replace("+00:00", "").replace("Z", "")
        if "T" in date_str:
            date = datetime.fromisoformat(date_str)
        else:
            date = datetime.strptime(date_str[:10], "%Y-%m-%d")
        return (datetime.now() - date).days
    except (ValueError, TypeError):
        return 999


def get_all_skill_profiles() -> List[SkillProfile]:
    """
    Calculate skill profiles for all learners by combining data sources.
    
    This is the main function that merges:
    - Unified users (base user list)
    - Learning activity
    - Product usage
    - Certification data
    """
    # Load all data sources
    learning_map = get_learning_activity_map()
    usage_map = get_product_usage_map()
    cert_map = get_certified_users_map()
    
    # Load unified users as the base
    unified_rows = parse_csv("unified_users.csv")
    
    profiles = []
    
    for row in unified_rows:
        handle = row.get("user_handle", "").strip()
        if not handle:
            continue
        
        try:
            dotcom_id = int(row.get("dotcom_id", 0) or 0)
        except (ValueError, TypeError):
            dotcom_id = 0
        
        # Get learning activity
        learning = learning_map.get(handle, {})
        learning_hours = learning.get("learning_hours", 0)
        learning_days = learning.get("learning_days", 0)
        page_views = learning.get("page_views", 0)
        learning_sessions = learning.get("learning_sessions", 0)
        first_learning = learning.get("first_learning", "")
        last_learning = learning.get("last_learning", "")
        
        # Also check unified user for page views if not in learning activity
        if page_views == 0:
            page_views = int(row.get("learn_page_views", 0) or 0)
            page_views += int(row.get("skills_page_views", 0) or 0)
            page_views += int(row.get("docs_page_views", 0) or 0)
        
        # Get product usage
        usage = usage_map.get(dotcom_id, {})
        product_usage_hours = usage.get("product_usage_hours", 0)
        copilot_days = usage.get("copilot_days", 0)
        copilot_events = usage.get("copilot_events", 0)
        actions_events = usage.get("actions_events", 0)
        security_events = usage.get("security_events", 0)
        activity_days = usage.get("activity_days", 0)
        
        # Get certification data
        cert = cert_map.get(handle, {})
        total_certs = cert.get("total_certs", 0)
        total_attempts = cert.get("total_attempts", 0)
        cert_titles = cert.get("cert_titles", [])
        days_since_cert = cert.get("days_since_cert", 999)
        
        # Calculate days since last activity
        last_activity = last_learning or row.get("last_learn_visit", "")
        days_since_last = calculate_days_since(last_activity)
        
        # First activity date
        first_activity = first_learning or row.get("first_learn_visit", "")
        
        # Calculate skill score
        score, level, dimensions = calculate_skill_score(
            # Learning inputs
            learning_hours=learning_hours,
            learning_days=learning_days,
            page_views=page_views,
            learning_sessions=learning_sessions,
            # Product usage inputs
            product_usage_hours=product_usage_hours,
            copilot_days=copilot_days,
            copilot_events=copilot_events,
            actions_events=actions_events,
            security_events=security_events,
            activity_days=activity_days,
            # Certification inputs
            total_certs=total_certs,
            total_attempts=total_attempts,
            days_since_cert=days_since_cert,
            cert_titles=cert_titles,
            # Consistency inputs
            first_activity_date=first_activity,
            last_activity_date=last_activity,
            # Growth inputs
            days_since_last_activity=days_since_last,
            recent_learning_hours=learning_hours / 3 if learning_hours else 0,  # Approximate
            recent_product_events=copilot_events / 12 if copilot_events else 0,  # Approximate
            is_improving=days_since_last < 30,
        )
        
        profile = SkillProfile(
            user_handle=handle,
            dotcom_id=dotcom_id,
            skill_score=round(score, 1),
            skill_level=level,
            dimensions=dimensions,
            learning_hours=learning_hours,
            learning_days=learning_days,
            product_usage_hours=product_usage_hours,
            copilot_days=copilot_days,
            actions_events=actions_events,
            security_events=security_events,
            total_certs=total_certs,
            days_since_last_activity=days_since_last,
            is_growing=days_since_last < 30,
        )
        
        profiles.append(profile)
    
    logger.info(f"Calculated skill profiles for {len(profiles)} learners")
    return profiles


def get_skill_journey_summary() -> SkillJourneyResponse:
    """
    Get the skill journey funnel and summary statistics.
    """
    profiles = get_all_skill_profiles()
    
    if not profiles:
        return SkillJourneyResponse(
            funnel=[],
            total_learners=0,
            avg_skill_score=0,
            skill_distribution={},
            dimension_averages={},
            growth_metrics={},
        )
    
    # Count by level
    level_counts: Dict[SkillLevel, List[SkillProfile]] = {
        level: [] for level in SkillLevel
    }
    for p in profiles:
        level_counts[p.skill_level].append(p)
    
    total = len(profiles)
    
    # Build funnel stages
    funnel = []
    for level in [SkillLevel.EXPLORING, SkillLevel.DEVELOPING, SkillLevel.PROFICIENT, 
                  SkillLevel.ADVANCED, SkillLevel.EXPERT]:
        level_profiles = level_counts[level]
        count = len(level_profiles)
        avg_score = sum(p.skill_score for p in level_profiles) / count if count else 0
        info = get_skill_level_info(level)
        
        funnel.append(SkillFunnelStage(
            level=level,
            count=count,
            percentage=round((count / total) * 100, 1) if total else 0,
            avg_score=round(avg_score, 1),
            color=info["color"],
            description=info["description"],
        ))
    
    # Calculate dimension averages
    dimension_totals: Dict[str, float] = {d.value: 0 for d in SkillDimension}
    for p in profiles:
        for dim in p.dimensions:
            dimension_totals[dim.dimension.value] += dim.raw_score
    
    dimension_averages = {
        k: round(v / total, 1) if total else 0
        for k, v in dimension_totals.items()
    }
    
    # Growth metrics
    growing_count = sum(1 for p in profiles if p.is_growing)
    active_30_days = sum(1 for p in profiles if p.days_since_last_activity <= 30)
    with_certs = sum(1 for p in profiles if p.total_certs > 0)
    
    return SkillJourneyResponse(
        funnel=funnel,
        total_learners=total,
        avg_skill_score=round(sum(p.skill_score for p in profiles) / total, 1),
        skill_distribution={level.value: len(level_counts[level]) for level in SkillLevel},
        dimension_averages=dimension_averages,
        growth_metrics={
            "growing_learners": growing_count,
            "growing_percentage": round((growing_count / total) * 100, 1) if total else 0,
            "active_30_days": active_30_days,
            "active_percentage": round((active_30_days / total) * 100, 1) if total else 0,
            "with_certifications": with_certs,
            "cert_percentage": round((with_certs / total) * 100, 1) if total else 0,
        },
    )


def get_top_skill_learners(limit: int = 10) -> List[SkillProfile]:
    """Get top learners by skill score."""
    profiles = get_all_skill_profiles()
    sorted_profiles = sorted(profiles, key=lambda p: p.skill_score, reverse=True)
    return sorted_profiles[:limit]


def get_skill_profile_by_handle(handle: str) -> Optional[SkillProfile]:
    """Get skill profile for a specific user."""
    profiles = get_all_skill_profiles()
    for p in profiles:
        if p.user_handle.lower() == handle.lower():
            return p
    return None
