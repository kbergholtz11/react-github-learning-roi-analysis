"""
Skill-based Journey Model

This module implements a skill-focused learner progression model that considers:
- Learning engagement (courses, documentation, skills platform)
- Product usage (Copilot, Actions, Security features)
- Certification (as validation, not the sole metric)
- Continuous growth (recency, consistency)

The model produces a Skill Score (0-100) and maps to Skill Levels.
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class SkillLevel(str, Enum):
    """Skill-based progression levels."""
    
    EXPLORING = "Exploring"          # Score 0-15: Just starting, minimal engagement
    DEVELOPING = "Developing"        # Score 16-35: Active learning, some product use
    PROFICIENT = "Proficient"        # Score 36-55: Regular usage, good learning progress
    ADVANCED = "Advanced"            # Score 56-75: Strong usage, certified, teaching others
    EXPERT = "Expert"                # Score 76-100: Deep expertise, multiple certs, high impact


class SkillDimension(str, Enum):
    """Dimensions contributing to skill score."""
    
    LEARNING = "Learning"            # Learning platform engagement
    PRODUCT_USAGE = "Product Usage"  # Actual GitHub product usage
    CERTIFICATION = "Certification"  # Formal certification achievement
    CONSISTENCY = "Consistency"      # Regular, sustained engagement
    GROWTH = "Growth"                # Recent improvement trajectory


# =============================================================================
# Scoring Weights - Configurable emphasis on different dimensions
# =============================================================================

DEFAULT_WEIGHTS = {
    SkillDimension.LEARNING: 0.25,        # 25% weight
    SkillDimension.PRODUCT_USAGE: 0.35,   # 35% weight - Primary focus
    SkillDimension.CERTIFICATION: 0.15,   # 15% weight - Important but not dominant
    SkillDimension.CONSISTENCY: 0.15,     # 15% weight
    SkillDimension.GROWTH: 0.10,          # 10% weight
}


# =============================================================================
# Skill Score Models
# =============================================================================

class DimensionScore(BaseModel):
    """Score for a single dimension."""
    
    dimension: SkillDimension
    raw_score: float = Field(ge=0, le=100)
    weighted_score: float = Field(ge=0, le=100)
    weight: float = Field(ge=0, le=1)
    details: Dict[str, float] = Field(default_factory=dict)


class SkillProfile(BaseModel):
    """Complete skill profile for a learner."""
    
    user_handle: str
    dotcom_id: Optional[int] = None
    
    # Overall scores
    skill_score: float = Field(ge=0, le=100)
    skill_level: SkillLevel
    
    # Dimension breakdown
    dimensions: List[DimensionScore] = Field(default_factory=list)
    
    # Key metrics used in calculation
    learning_hours: float = 0
    learning_days: int = 0
    product_usage_hours: float = 0
    copilot_days: int = 0
    actions_events: int = 0
    security_events: int = 0
    total_certs: int = 0
    days_since_last_activity: int = 0
    
    # Trajectory
    is_growing: bool = False
    growth_rate: float = 0  # % change in last 30 days


class SkillFunnelStage(BaseModel):
    """A stage in the skill-based funnel."""
    
    level: SkillLevel
    count: int
    percentage: float
    avg_score: float
    color: str
    description: str


class SkillJourneyResponse(BaseModel):
    """Response for skill journey API."""
    
    funnel: List[SkillFunnelStage]
    total_learners: int
    avg_skill_score: float
    skill_distribution: Dict[str, int]
    dimension_averages: Dict[str, float]
    growth_metrics: Dict[str, float]


# =============================================================================
# Skill Scoring Functions
# =============================================================================

def calculate_learning_score(
    learning_hours: float = 0,
    learning_days: int = 0,
    page_views: int = 0,
    learning_sessions: int = 0,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate learning engagement score (0-100).
    
    Factors:
    - Total learning hours (up to 50 hours = full points)
    - Days of learning activity (up to 30 days = full points)
    - Page views (engagement breadth)
    - Session frequency (learning consistency)
    """
    # Hours component (0-40 points)
    hours_score = min(40, (learning_hours / 50) * 40)
    
    # Days component (0-30 points)
    days_score = min(30, (learning_days / 30) * 30)
    
    # Engagement component (0-30 points)
    views_score = min(15, (page_views / 200) * 15)
    sessions_score = min(15, (learning_sessions / 50) * 15)
    
    total = hours_score + days_score + views_score + sessions_score
    
    return total, {
        "hours_contribution": hours_score,
        "days_contribution": days_score,
        "views_contribution": views_score,
        "sessions_contribution": sessions_score,
    }


def calculate_product_usage_score(
    product_usage_hours: float = 0,
    copilot_days: int = 0,
    copilot_events: int = 0,
    actions_events: int = 0,
    security_events: int = 0,
    activity_days: int = 0,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate product usage score (0-100).
    
    Factors:
    - Total platform usage hours
    - Copilot adoption (days used, events)
    - Actions usage
    - Security features usage
    - Overall activity days
    """
    # Usage hours (0-30 points)
    hours_score = min(30, (product_usage_hours / 200) * 30)
    
    # Copilot adoption (0-30 points) - Key product
    copilot_days_score = min(15, (copilot_days / 60) * 15)
    copilot_events_score = min(15, (copilot_events / 5000) * 15)
    copilot_score = copilot_days_score + copilot_events_score
    
    # Actions usage (0-20 points)
    actions_score = min(20, (actions_events / 5000) * 20)
    
    # Security usage (0-10 points) - Advanced feature
    security_score = min(10, (security_events / 100) * 10)
    
    # Activity consistency (0-10 points)
    consistency_score = min(10, (activity_days / 100) * 10)
    
    total = hours_score + copilot_score + actions_score + security_score + consistency_score
    
    return total, {
        "hours_contribution": hours_score,
        "copilot_contribution": copilot_score,
        "actions_contribution": actions_score,
        "security_contribution": security_score,
        "consistency_contribution": consistency_score,
    }


def calculate_certification_score(
    total_certs: int = 0,
    total_attempts: int = 0,
    days_since_cert: int = 0,
    cert_titles: Optional[List[str]] = None,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate certification score (0-100).
    
    Factors:
    - Number of certifications earned
    - Certification diversity (different products)
    - Recency of certification
    - Attempt efficiency
    """
    cert_titles = cert_titles or []
    
    # Base cert score (0-50 points) - up to 4 certs
    base_score = min(50, total_certs * 12.5)
    
    # Diversity bonus (0-20 points) - unique cert types
    unique_certs = len(set(cert_titles))
    diversity_score = min(20, unique_certs * 5)
    
    # Recency bonus (0-20 points) - recent certs more valuable
    if total_certs > 0 and days_since_cert < 365:
        recency_score = max(0, 20 - (days_since_cert / 365) * 20)
    else:
        recency_score = 0
    
    # Efficiency bonus (0-10 points)
    if total_attempts > 0 and total_certs > 0:
        pass_rate = total_certs / total_attempts
        efficiency_score = pass_rate * 10
    else:
        efficiency_score = 0
    
    total = base_score + diversity_score + recency_score + efficiency_score
    
    return total, {
        "base_contribution": base_score,
        "diversity_contribution": diversity_score,
        "recency_contribution": recency_score,
        "efficiency_contribution": efficiency_score,
    }


def calculate_consistency_score(
    first_activity_date: Optional[str] = None,
    last_activity_date: Optional[str] = None,
    activity_days: int = 0,
    learning_days: int = 0,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate consistency score (0-100).
    
    Factors:
    - Tenure (how long engaged with platform)
    - Activity frequency (% of days active)
    - Learning regularity
    """
    now = datetime.now()
    
    # Tenure score (0-40 points)
    tenure_days = 0
    if first_activity_date:
        try:
            first = datetime.fromisoformat(first_activity_date.replace("+00:00", ""))
            tenure_days = (now - first).days
        except ValueError:
            pass
    tenure_score = min(40, (tenure_days / 180) * 40)  # 6 months = full points
    
    # Activity frequency (0-30 points)
    if tenure_days > 0:
        activity_rate = activity_days / tenure_days
        frequency_score = min(30, activity_rate * 100)
    else:
        frequency_score = 0
    
    # Learning regularity (0-30 points)
    if tenure_days > 0:
        learning_rate = learning_days / tenure_days
        regularity_score = min(30, learning_rate * 150)
    else:
        regularity_score = 0
    
    total = tenure_score + frequency_score + regularity_score
    
    return total, {
        "tenure_contribution": tenure_score,
        "frequency_contribution": frequency_score,
        "regularity_contribution": regularity_score,
    }


def calculate_growth_score(
    days_since_last_activity: int = 0,
    recent_learning_hours: float = 0,
    recent_product_events: int = 0,
    is_improving: bool = False,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate growth/trajectory score (0-100).
    
    Factors:
    - Recency of activity
    - Recent learning engagement
    - Recent product usage
    - Improvement trajectory
    """
    # Recency (0-40 points) - active in last 30 days = full points
    if days_since_last_activity <= 7:
        recency_score = 40
    elif days_since_last_activity <= 14:
        recency_score = 35
    elif days_since_last_activity <= 30:
        recency_score = 25
    elif days_since_last_activity <= 60:
        recency_score = 15
    elif days_since_last_activity <= 90:
        recency_score = 5
    else:
        recency_score = 0
    
    # Recent learning (0-30 points)
    learning_score = min(30, (recent_learning_hours / 10) * 30)
    
    # Recent usage (0-20 points)
    usage_score = min(20, (recent_product_events / 500) * 20)
    
    # Improvement bonus (0-10 points)
    improvement_score = 10 if is_improving else 0
    
    total = recency_score + learning_score + usage_score + improvement_score
    
    return total, {
        "recency_contribution": recency_score,
        "recent_learning_contribution": learning_score,
        "recent_usage_contribution": usage_score,
        "improvement_contribution": improvement_score,
    }


def calculate_skill_score(
    # Learning inputs
    learning_hours: float = 0,
    learning_days: int = 0,
    page_views: int = 0,
    learning_sessions: int = 0,
    # Product usage inputs
    product_usage_hours: float = 0,
    copilot_days: int = 0,
    copilot_events: int = 0,
    actions_events: int = 0,
    security_events: int = 0,
    activity_days: int = 0,
    # Certification inputs
    total_certs: int = 0,
    total_attempts: int = 0,
    days_since_cert: int = 0,
    cert_titles: Optional[List[str]] = None,
    # Consistency inputs
    first_activity_date: Optional[str] = None,
    last_activity_date: Optional[str] = None,
    # Growth inputs
    days_since_last_activity: int = 0,
    recent_learning_hours: float = 0,
    recent_product_events: int = 0,
    is_improving: bool = False,
    # Weights
    weights: Optional[Dict[SkillDimension, float]] = None,
) -> Tuple[float, SkillLevel, List[DimensionScore]]:
    """
    Calculate overall skill score and level.
    
    Returns:
        Tuple of (score, level, dimension_scores)
    """
    weights = weights or DEFAULT_WEIGHTS
    
    # Calculate each dimension
    learning_raw, learning_details = calculate_learning_score(
        learning_hours, learning_days, page_views, learning_sessions
    )
    
    usage_raw, usage_details = calculate_product_usage_score(
        product_usage_hours, copilot_days, copilot_events,
        actions_events, security_events, activity_days
    )
    
    cert_raw, cert_details = calculate_certification_score(
        total_certs, total_attempts, days_since_cert, cert_titles
    )
    
    consistency_raw, consistency_details = calculate_consistency_score(
        first_activity_date, last_activity_date, activity_days, learning_days
    )
    
    growth_raw, growth_details = calculate_growth_score(
        days_since_last_activity, recent_learning_hours,
        recent_product_events, is_improving
    )
    
    # Build dimension scores
    dimensions = [
        DimensionScore(
            dimension=SkillDimension.LEARNING,
            raw_score=learning_raw,
            weighted_score=learning_raw * weights[SkillDimension.LEARNING],
            weight=weights[SkillDimension.LEARNING],
            details=learning_details,
        ),
        DimensionScore(
            dimension=SkillDimension.PRODUCT_USAGE,
            raw_score=usage_raw,
            weighted_score=usage_raw * weights[SkillDimension.PRODUCT_USAGE],
            weight=weights[SkillDimension.PRODUCT_USAGE],
            details=usage_details,
        ),
        DimensionScore(
            dimension=SkillDimension.CERTIFICATION,
            raw_score=cert_raw,
            weighted_score=cert_raw * weights[SkillDimension.CERTIFICATION],
            weight=weights[SkillDimension.CERTIFICATION],
            details=cert_details,
        ),
        DimensionScore(
            dimension=SkillDimension.CONSISTENCY,
            raw_score=consistency_raw,
            weighted_score=consistency_raw * weights[SkillDimension.CONSISTENCY],
            weight=weights[SkillDimension.CONSISTENCY],
            details=consistency_details,
        ),
        DimensionScore(
            dimension=SkillDimension.GROWTH,
            raw_score=growth_raw,
            weighted_score=growth_raw * weights[SkillDimension.GROWTH],
            weight=weights[SkillDimension.GROWTH],
            details=growth_details,
        ),
    ]
    
    # Calculate total score
    total_score = sum(d.weighted_score for d in dimensions)
    
    # Determine skill level
    if total_score >= 76:
        level = SkillLevel.EXPERT
    elif total_score >= 56:
        level = SkillLevel.ADVANCED
    elif total_score >= 36:
        level = SkillLevel.PROFICIENT
    elif total_score >= 16:
        level = SkillLevel.DEVELOPING
    else:
        level = SkillLevel.EXPLORING
    
    return total_score, level, dimensions


# =============================================================================
# Skill Level Colors and Descriptions
# =============================================================================

SKILL_LEVEL_CONFIG = {
    SkillLevel.EXPLORING: {
        "color": "#94a3b8",  # Slate
        "description": "Getting started with GitHub learning resources",
    },
    SkillLevel.DEVELOPING: {
        "color": "#3b82f6",  # Blue
        "description": "Actively building skills through learning and practice",
    },
    SkillLevel.PROFICIENT: {
        "color": "#22c55e",  # Green
        "description": "Demonstrated competency with regular product usage",
    },
    SkillLevel.ADVANCED: {
        "color": "#8b5cf6",  # Purple
        "description": "Deep expertise with certifications and high impact",
    },
    SkillLevel.EXPERT: {
        "color": "#f59e0b",  # Amber
        "description": "Mastery level with broad expertise across products",
    },
}


def get_skill_level_info(level: SkillLevel) -> Dict[str, str]:
    """Get color and description for a skill level."""
    return SKILL_LEVEL_CONFIG.get(level, {"color": "#94a3b8", "description": ""})
