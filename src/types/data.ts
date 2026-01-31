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

// Journey funnel data
export interface JourneyFunnelData {
  stage: string;
  count: number;
  percentage: number;
  color: string;
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
