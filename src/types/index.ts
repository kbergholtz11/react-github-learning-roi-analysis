/**
 * TypeScript type definitions for the Learning ROI Dashboard
 * These match the backend data schema
 */

// Learner types
export interface Learner {
  user_id: string;
  email: string;
  name?: string;
  journey_stage: JourneyStage;
  engagement_level: EngagementLevel;
  is_certified: boolean;
  cert_date?: string;
  cert_type?: CertificationType;
  days_to_certification?: number;
  primary_product_focus?: ProductFocus;
  products_using: string[];
  total_learning_days: number;
  total_events: number;
  content_views: number;
  learning_hours: number;
  product_usage_hours: number;
  roi_multiplier: number;
  learner_status: LearnerStatus;
  product_adoption_status: AdoptionStatus;
  first_learning_date?: string;
  last_activity_date?: string;
  days_since_last_activity: number;
}

export type JourneyStage = 
  | "New Learner"
  | "Active Learner"
  | "Engaged"
  | "Certified"
  | "Power User"
  | "Champion";

export type EngagementLevel = "Low" | "Medium" | "Heavy" | "Power";

export type CertificationType = 
  | "GitHub Foundations"
  | "GitHub Actions"
  | "GitHub Admin"
  | "GitHub Advanced Security"
  | "GitHub Copilot";

export type ProductFocus = 
  | "GitHub Copilot"
  | "GitHub Actions"
  | "Advanced Security"
  | "Admin & Platform";

export type LearnerStatus = 
  | "New"
  | "Active"
  | "Certified"
  | "Specialist"
  | "Multi-Certified"
  | "Champion";

export type AdoptionStatus = "Not Started" | "Trial" | "Active" | "Power User";

// Event types
export interface LearningEvent {
  id: string;
  name: string;
  type: EventType;
  date: string;
  attendees: number;
  capacity: number;
  location?: string;
  product_focus?: ProductFocus;
  satisfaction_score?: number;
}

export type EventType = 
  | "Bootcamp"
  | "Workshop"
  | "Webinar"
  | "Office Hours"
  | "Hackathon";

// Certification types
export interface Certification {
  id: string;
  user_id: string;
  cert_type: CertificationType;
  cert_date: string;
  score?: number;
  expires_at?: string;
}

// Analytics types
export interface CopilotMetrics {
  total_users: number;
  active_users: number;
  trial_users: number;
  paid_users: number;
  avg_acceptance_rate: number;
  total_suggestions: number;
  total_acceptances: number;
  lines_of_code_generated: number;
  time_saved_hours: number;
}

export interface ROIMetrics {
  total_investment: number;
  total_return: number;
  roi_percentage: number;
  cost_per_certification: number;
  productivity_gain_hours: number;
  quality_improvement_percentage: number;
}

export interface JourneyFunnelStage {
  name: string;
  count: number;
  percentage: number;
  conversion_rate?: number;
  avg_days_in_stage?: number;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// Filter types
export interface LearnerFilters {
  journey_stage?: JourneyStage[];
  engagement_level?: EngagementLevel[];
  is_certified?: boolean;
  product_focus?: ProductFocus[];
  search?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

// Dashboard summary types
export interface DashboardSummary {
  total_learners: number;
  active_learners: number;
  certified_users: number;
  certification_rate: number;
  avg_roi: number;
  total_events: number;
  copilot_users: number;
  product_adoption_rate: number;
}

// Alert types
export interface Alert {
  id: string;
  type: "error" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  source?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
  notifications: string[];
  threshold?: number;
}

// Export/Report types
export interface ReportConfig {
  name: string;
  fields: string[];
  filters: LearnerFilters;
  format: "csv" | "excel" | "pdf";
  include_summary: boolean;
}

export interface ExportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  download_url?: string;
  error?: string;
  created_at: string;
  completed_at?: string;
}
