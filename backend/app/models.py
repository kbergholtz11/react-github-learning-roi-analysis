"""Pydantic models for API request/response schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class LearnerStatus(str, Enum):
    """Learner certification status levels."""

    CHAMPION = "Champion"
    SPECIALIST = "Specialist"
    MULTI_CERTIFIED = "Multi-Certified"
    CERTIFIED = "Certified"
    LEARNING = "Learning"


class JourneyStage(str, Enum):
    """Learner journey stages."""

    EXPLORING = "Exploring"
    ACTIVE_LEARNER = "Active Learner"
    LEARNING = "Learning"
    CERTIFIED = "Certified"
    MULTI_CERTIFIED = "Multi-Certified"
    SPECIALIST = "Specialist"
    CHAMPION = "Champion"


# =============================================================================
# Learner Models
# =============================================================================


class LearnerBase(BaseModel):
    """Base learner information."""

    email: str
    user_handle: str
    learner_status: LearnerStatus
    journey_stage: str | None = None


class CertifiedUser(LearnerBase):
    """Certified user with certification details."""

    dotcom_id: int
    cert_product_focus: str | None = None
    first_cert_date: str | None = None
    latest_cert_date: str | None = None
    total_certs: int = 0
    total_attempts: int = 0
    cert_titles: list[str] = Field(default_factory=list)
    exam_codes: list[str] = Field(default_factory=list)
    days_since_cert: int = 0


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

    search: str | None = None
    learner_status: LearnerStatus | None = None
    is_certified: bool | None = None
    product_focus: str | None = None
    min_certs: int | None = None
    max_certs: int | None = None
    certified_after: datetime | None = None
    certified_before: datetime | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)


class LearnersResponse(BaseModel):
    """Paginated learners response."""

    learners: list[CertifiedUser | UnifiedUser]
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
    status_breakdown: list[StatusBreakdown]
    funnel: list[JourneyFunnelStage]


# =============================================================================
# Journey Models
# =============================================================================


class DropOffAnalysis(BaseModel):
    """Drop-off analysis between stages."""

    stage: str
    count: int
    drop_off_rate: float
    next_stage: str | None


class MonthlyProgression(BaseModel):
    """Monthly progression data."""

    name: str
    learning: int
    certified: int
    multi_cert: int


class JourneyResponse(BaseModel):
    """Journey analytics response."""

    funnel: list[JourneyFunnelStage]
    avg_time_to_completion: int
    stage_velocity: dict[str, int]
    drop_off_analysis: list[DropOffAnalysis]
    monthly_progression: list[MonthlyProgression]
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

    stage_impact: list[StageImpact]
    product_adoption: list[ProductAdoption]
    correlation_data: list[CorrelationData]
    roi_breakdown: list[dict]


# =============================================================================
# Real-time Query Models
# =============================================================================


class KustoQueryRequest(BaseModel):
    """Request for custom Kusto query."""

    query: str
    parameters: dict | None = None


class KustoQueryResponse(BaseModel):
    """Response from Kusto query."""

    columns: list[str]
    rows: list[dict]
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
    journey_stage: str | None
    certifications: list[str]
    total_certs: int
    first_cert_date: str | None
    latest_cert_date: str | None
    learning_hours: float
    product_usage_hours: float
    events_attended: int
    top_products: list[str]
    activity_trend: list[dict]


class UserActivityRequest(BaseModel):
    """Request for user activity data."""

    email: str | None = None
    user_handle: str | None = None
    include_activity: bool = True
    include_certifications: bool = True
    include_product_usage: bool = True
