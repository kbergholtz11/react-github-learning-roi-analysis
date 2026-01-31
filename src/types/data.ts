// Data types matching the CSV schema from the backend

// Individual exam record with date and score
export interface IndividualExam {
  exam_code: string;
  exam_name: string;
  exam_date: string;
  passed: boolean;
  score_percent: number | null;
  attempt_number: number;
}

// Certified Users (from certified_users.csv)
export interface CertifiedUser {
  email: string;
  dotcom_id: number;
  user_handle: string;
  learner_status: LearnerStatus;
  journey_stage: string;
  cert_product_focus: string;
  first_cert_date: string;
  latest_cert_date: string;
  total_certs: number;
  total_attempts: number;
  cert_titles: string[];
  exam_codes: string[];
  days_since_cert: number;
  exams?: IndividualExam[]; // Optional individual exam records
}

// Unified Users (from unified_users.csv)
export interface UnifiedUser {
  dotcom_id: number;
  email: string;
  user_handle: string;
  total_attempts: number;
  total_passed: number;
  total_registrations: number;
  total_delivered: number;
  total_no_shows: number;
  total_scheduled: number;
  total_canceled: number;
  total_expired: number;
  first_exam_date: string | null;
  last_exam_date: string | null;
  certifications: string | null;
  has_certification: boolean;
  source: string;
  learn_page_views: number;
  first_learn_visit: string | null;
  last_learn_visit: string | null;
  skills_page_views: number;
  first_skills_visit: string | null;
  last_skills_visit: string | null;
  docs_page_views: number;
  docs_sessions: number;
  first_docs_visit: string | null;
  last_docs_visit: string | null;
  events_registered: number;
  first_event: string | null;
  last_event: string | null;
  event_types: string | null;
  learner_status: LearnerStatus;
}

// Data quality level - matches enrichment pipeline output
export type DataQualityLevel = "high" | "medium" | "low";

// Enriched Learner (from DuckDB/Parquet enriched data)
export interface EnrichedLearner {
  email: string;
  dotcom_id: number;
  userhandle: string;
  first_name: string | null;
  last_name: string | null;
  job_role: string | null;
  
  // Company fields
  exam_company: string | null;
  exam_company_type: string | null;
  ace_company: string | null;
  ace_company_type: string | null;
  company_name: string;
  company_source: string;
  
  // Location fields
  exam_country: string | null;
  exam_region: string | null;
  ace_country: string | null;
  ace_region: string | null;
  country: string | null;
  region: string | null;
  
  // Certification fields
  registration_date: boolean;
  total_exams: number;
  exams_passed: number;
  first_exam: string | null;
  last_exam: string | null;
  cert_names: string[] | null;
  exam_codes: string[] | null;
  learner_status: LearnerStatus;
  journey_stage: string;
  
  // Partner certs
  partner_certs: number;
  partner_cert_names: string | null;
  partner_companies: string | null;
  first_partner_cert: string | null;
  last_partner_cert: string | null;
  
  // Events
  events_registered: number;
  first_event: string | null;
  last_event: string | null;
  
  // Account flags
  is_staff: boolean;
  is_spammy: boolean;
  is_suspended: boolean;
  is_disabled: boolean;
  is_paid: boolean;
  is_dunning: boolean;
  is_education: boolean;
  plan: string | null;
  billing_type: string | null;
  billing_cycle: string | null;
  
  // Org data
  org_msft_tpid: string | null;
  org_msft_tpid_name: string | null;
  org_customer_name: string | null;
  enterprise_customer_name: string | null;
  org_has_enterprise_agreements: boolean;
  org_count: number;
  
  // Copilot usage - multi-window metrics (90d, 180d, 365d)
  uses_copilot: boolean;  // Active in last 90 days (backward compatible)
  copilot_ever_used: boolean;  // Ever used in 365-day window
  copilot_usage_recency: 'active_90d' | 'active_180d' | 'active_365d' | 'never';
  copilot_days: number;  // Total days in 365-day window
  copilot_days_90d: number;  // Days active in last 90 days
  copilot_days_180d: number;  // Days active in last 180 days
  copilot_events_90d: number;  // Events in last 90 days
  copilot_events_180d: number;  // Events in last 180 days
  copilot_engagement_events: number;
  copilot_contribution_events: number;
  copilot_products: string | null;
  copilot_features: string | null;
  copilot_first_use: string | null;  // First usage date
  copilot_last_use: string | null;  // Last usage date
  
  // Actions usage - multi-window metrics
  uses_actions: boolean;  // Active in last 90 days
  actions_ever_used: boolean;  // Ever used in 365-day window
  actions_usage_recency: 'active_90d' | 'active_180d' | 'active_365d' | 'never';
  actions_days: number;  // Total days in 365-day window
  actions_days_90d: number;
  actions_days_180d: number;
  actions_events_90d: number;
  actions_events_180d: number;
  actions_engagement_events: number;
  actions_contribution_events: number;
  actions_first_use: string | null;
  actions_last_use: string | null;
  
  // Security usage - multi-window metrics
  uses_security: boolean;  // Active in last 90 days
  security_ever_used: boolean;  // Ever used in 365-day window
  security_usage_recency: 'active_90d' | 'active_180d' | 'active_365d' | 'never';
  security_days: number;  // Total days in 365-day window
  security_days_90d: number;
  security_days_180d: number;
  security_engagement_events: number;
  security_first_use: string | null;
  security_last_use: string | null;
  
  // Pull Requests - collaboration skills
  uses_pr: boolean;
  pr_ever_used: boolean;
  pr_days: number;
  pr_days_90d: number;
  pr_events: number;
  
  // Issues - project management skills
  uses_issues: boolean;
  issues_ever_used: boolean;
  issues_days: number;
  issues_days_90d: number;
  issues_events: number;
  
  // Code Search - navigation proficiency
  uses_code_search: boolean;
  code_search_ever_used: boolean;
  code_search_days: number;
  code_search_days_90d: number;
  code_search_events: number;
  
  // Packages - publishing/consumption
  uses_packages: boolean;
  packages_ever_used: boolean;
  packages_days: number;
  packages_days_90d: number;
  packages_events: number;
  
  // Projects - planning skills
  uses_projects: boolean;
  projects_ever_used: boolean;
  projects_days: number;
  projects_days_90d: number;
  projects_events: number;
  
  // Discussions - community engagement
  uses_discussions: boolean;
  discussions_ever_used: boolean;
  discussions_days: number;
  discussions_days_90d: number;
  discussions_events: number;
  
  // Pages - documentation skills
  uses_pages: boolean;
  pages_ever_used: boolean;
  pages_days: number;
  pages_days_90d: number;
  pages_events: number;
  
  // Skill Maturity
  skill_maturity_score: number;  // 0-100 score
  skill_maturity_level: 'Novice' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  products_adopted_count: number;  // Count of products used (0-10)
  
  // Aggregate activity - multi-window metrics
  total_active_days: number;  // Total days in 365-day window
  total_active_days_90d: number;
  total_active_days_180d: number;
  total_engagement_events: number;
  total_contribution_events: number;
  products_used: string | null;
  features_used: string | null;
  countries_active: string | null;
  first_activity: string | null;
  last_activity: string | null;
  
  // Data quality
  data_quality_score: number;
  data_quality_level: DataQualityLevel;
}

// Product Usage (from product_usage.csv)
export interface ProductUsage {
  dotcom_id: number;
  activity_days: number;
  copilot_events: number;
  copilot_days: number;
  actions_events: number;
  security_events: number;
  total_events: number;
  product_usage_hours: number;
}

// Learning Activity (from learning_activity.csv)
export interface LearningActivity {
  user_ref: string;
  page_views: number;
  learning_sessions: number;
  learning_days: number;
  learning_hours: number;
  first_learning: string;
  last_learning: string;
}

// Journey Complete (from journey_complete.csv)
export interface JourneyUser {
  user_id: number;
  email: string;
  journey_stage: string;
  first_touch_date: string;
  cert_date: string | null;
  is_certified: boolean;
  product_focus: string;
  total_learning_events: number;
  avg_engagement_score: number;
  stage_velocity_days: Record<string, number>;
  time_to_certification: number | null;
  content_completion_rate: number;
  learning_path_progress: Record<string, number>;
  first_touch_channel: string;
  certification_driver: string;
  days_to_first_product_use: number | null;
  post_cert_engagement_score: number;
  learning_hours: number;
  product_usage_hours: number;
  features_adopted: number;
  product_usage_days: number;
  roi_multiplier: number;
  active_last_30_days: boolean;
  primary_product_focus: string;
  product_adoption_status: string;
}

// Learner Status enum - matches enrichment pipeline output
export type LearnerStatus =
  | "Champion"
  | "Specialist"
  | "Multi-Certified"
  | "Certified"
  | "Learning"
  | "Engaged"
  | "Registered";

// Journey Stage enum - matches enrichment pipeline output
export type JourneyStage =
  | "Stage 2: Registered"
  | "Stage 3: Engaged"
  | "Stage 4: Learning"
  | "Stage 6: Certified"
  | "Stage 9: Power User"
  | "Stage 10: Specialist"
  | "Stage 11: Champion";

// Aggregated metrics for dashboard
export interface DashboardMetrics {
  totalLearners: number;
  activeLearners: number;
  certifiedUsers: number;
  learningUsers: number;
  prospectUsers: number;
  avgUsageIncrease: number;
  avgProductsAdopted: number;
  avgLearningHours: number;
  impactScore: number;
  retentionRate: number;
  totalLearningHours: number;
  totalCertsEarned: number;
}

// Journey funnel data (progression-based)
export interface JourneyFunnelData {
  stage: string;
  count: number;
  percentage: number;
  color: string;
  description?: string;
  conversionToNext?: number | null;
}

// Journey progression analysis
export interface JourneyProgressionAnalysis {
  stage: string;
  count: number;
  description?: string;
  conversionRate: number;
  dropOffRate: number;
  nextStage: string | null;
  avgDaysInStage?: number;
}

// Journey milestones
export interface JourneyMilestones {
  firstTouchUsers: number;
  exploringUsers: number;
  engagedUsers: number;
  learningUsers: number;
  certifiedUsers: number;
  powerUsers: number;
  champions: number;
}

// Data source counts
export interface JourneyDataSourceCounts {
  githubLearn: number;
  githubActivity: number;
  skillsEnrollments: number;
  certifiedUsers: number;
}

// Learner status breakdown
export interface LearnerStatusBreakdown {
  status: LearnerStatus;
  count: number;
  percentage: number;
}

// Product adoption data
export interface ProductAdoptionData {
  product: string;
  beforeLearning: number;
  afterLearning: number;
  increase: number;
}

// Time series data point
export interface TimeSeriesDataPoint {
  name: string;
  [key: string]: string | number;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  total: number;
  page?: number;
  pageSize?: number;
}

// Filter options
export interface LearnerFilters {
  search?: string;
  learnerStatus?: LearnerStatus | "all";
  journeyStage?: string | "all";
  isCertified?: boolean | "all";
  productFocus?: string | "all";
  page?: number;
  pageSize?: number;
}
