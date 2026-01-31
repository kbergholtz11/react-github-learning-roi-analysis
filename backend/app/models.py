from typing import Any, Dict, List, Optional
"""Pydantic models for API request/response schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class LearnerStatus(str, Enum):
    """Learner certification status levels.

    Matches the enrichment pipeline output (sync-enriched-learners.py).
    """

    CHAMPION = "Champion"
    SPECIALIST = "Specialist"
    MULTI_CERTIFIED = "Multi-Certified"
    CERTIFIED = "Certified"
    LEARNING = "Learning"
    ENGAGED = "Engaged"
    REGISTERED = "Registered"


class JourneyStage(str, Enum):
    """Learner journey stages.

    Matches the enrichment pipeline output (sync-enriched-learners.py).
    """

    REGISTERED = "Stage 2: Registered"
    ENGAGED = "Stage 3: Engaged"
    LEARNING = "Stage 4: Learning"
    CERTIFIED = "Stage 6: Certified"
    POWER_USER = "Stage 9: Power User"
    SPECIALIST = "Stage 10: Specialist"
    CHAMPION = "Stage 11: Champion"


# =============================================================================
# Learner Models
# =============================================================================


class LearnerBase(BaseModel):
    """Base learner information."""

    email: str
    user_handle: str
    learner_status: LearnerStatus
    journey_stage: Optional[str] = None


class CertifiedUser(LearnerBase):
    """Certified user with certification details."""

    dotcom_id: int
    cert_product_focus: Optional[str] = None
    first_cert_date: Optional[str] = None
    latest_cert_date: Optional[str] = None
    total_certs: int = 0
    total_attempts: int = 0
    cert_titles: List[str] = Field(default_factory=list)
    exam_codes: List[str] = Field(default_factory=list)
    days_since_cert: int = 0


class IndividualExam(BaseModel):
    """Individual exam record with date and score."""

    exam_code: str
    exam_name: str
    exam_date: str
    passed: bool
    score_percent: Optional[float] = None
    attempt_number: int = 1


class LearnerWithExams(CertifiedUser):
    """Certified user with individual exam records."""

    exams: List[IndividualExam] = Field(default_factory=list)


class UnifiedUser(LearnerBase):
    """Unified user with all learning activity."""

    dotcom_id: int
    total_attempts: int = 0
    total_passed: int = 0
    has_certification: bool = False
    learn_page_views: int = 0
    skills_page_views: int = 0
    docs_page_views: int = 0
    events_registered: int = 0


class LearnerFilters(BaseModel):
    """Filters for learner queries."""

    search: Optional[str] = None
    learner_status: Optional[LearnerStatus] = None
    is_certified: Optional[bool] = None
    product_focus: Optional[str] = None
    min_certs: Optional[int] = None
    max_certs: Optional[int] = None
    certified_after: Optional[datetime] = None
    certified_before: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)


class LearnersResponse(BaseModel):
    """Paginated learners response."""

    learners: List[Any]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


# =============================================================================
# Metrics Models
# =============================================================================


class DashboardMetrics(BaseModel):
    """Aggregated dashboard metrics."""

    total_learners: int
    active_learners: int
    certified_users: int
    learning_users: int
    prospect_users: int
    avg_usage_increase: float
    avg_products_adopted: float
    avg_learning_hours: float
    impact_score: int
    retention_rate: float
    total_learning_hours: int
    total_certs_earned: int


class StatusBreakdown(BaseModel):
    """Breakdown of learners by status."""

    status: LearnerStatus
    count: int
    percentage: float


class JourneyFunnelStage(BaseModel):
    """Single stage in the journey funnel."""

    stage: str
    count: int
    percentage: float
    color: str


class MetricsResponse(BaseModel):
    """Full metrics response."""

    metrics: DashboardMetrics
    status_breakdown: List[StatusBreakdown]
    funnel: List[JourneyFunnelStage]


# =============================================================================
# Journey Models
# =============================================================================


class DropOffAnalysis(BaseModel):
    """Drop-off analysis between stages."""

    stage: str
    count: int
    drop_off_rate: float
    next_stage: Optional[str]


class MonthlyProgression(BaseModel):
    """Monthly progression data."""

    name: str
    learning: int
    certified: int
    multi_cert: int


class JourneyResponse(BaseModel):
    """Journey analytics response."""

    funnel: List[JourneyFunnelStage]
    avg_time_to_completion: int
    stage_velocity: Dict[str, int]
    drop_off_analysis: List[DropOffAnalysis]
    monthly_progression: List[MonthlyProgression]
    total_journey_users: int


# =============================================================================
# Impact Models
# =============================================================================


class StageImpact(BaseModel):
    """Impact metrics for a journey stage."""

    stage: str
    learners: int
    avg_usage_increase: float
    platform_time_increase: float
    top_product: str


class ProductAdoption(BaseModel):
    """Product adoption before/after learning."""

    name: str
    before: float
    after: float


class CorrelationData(BaseModel):
    """Learning-to-usage correlation data point."""

    name: str
    learning_hours: float
    product_usage: float
    platform_time: float


class ImpactResponse(BaseModel):
    """Impact analytics response."""

    stage_impact: List[StageImpact]
    product_adoption: List[ProductAdoption]
    correlation_data: List[CorrelationData]
    roi_breakdown: List[dict]


# =============================================================================
# Real-time Query Models
# =============================================================================


class KustoQueryRequest(BaseModel):
    """Request for custom Kusto query."""

    query: str
    parameters: Optional[dict] = None


class KustoQueryResponse(BaseModel):
    """Response from Kusto query."""

    columns: List[str]
    rows: List[dict]
    row_count: int
    execution_time_ms: float


# =============================================================================
# User-specific Models
# =============================================================================


class UserProfile(BaseModel):
    """Detailed user profile."""

    email: str
    user_handle: str
    learner_status: LearnerStatus
    journey_stage: Optional[str]
    certifications: List[str]
    total_certs: int
    first_cert_date: Optional[str]
    latest_cert_date: Optional[str]
    learning_hours: float
    product_usage_hours: float
    events_attended: int
    top_products: List[str]
    activity_trend: List[dict]


class UserActivityRequest(BaseModel):
    """Request for user activity data."""

    email: Optional[str] = None
    user_handle: Optional[str] = None
    include_activity: bool = True
    include_certifications: bool = True
    include_product_usage: bool = True
