import { parse } from "csv-parse/sync";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type {
  CertifiedUser,
  UnifiedUser,
  ProductUsage,
  LearningActivity,
  JourneyUser,
  DashboardMetrics,
  JourneyFunnelData,
  LearnerStatusBreakdown,
  LearnerStatus,
  LearnerFilters,
} from "@/types/data";

// Data directory path
const DATA_DIR = join(process.cwd(), "data");

// Cache for parsed CSV data
const cache: {
  certifiedUsers?: CertifiedUser[];
  unifiedUsers?: UnifiedUser[];
  productUsage?: ProductUsage[];
  learningActivity?: LearningActivity[];
  journeyUsers?: JourneyUser[];
  lastLoaded?: number;
} = {};

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

function shouldRefreshCache(): boolean {
  if (!cache.lastLoaded) return true;
  return Date.now() - cache.lastLoaded > CACHE_TTL;
}

function parseCSV<T>(filename: string): T[] {
  const filepath = join(DATA_DIR, filename);
  if (!existsSync(filepath)) {
    console.warn(`File not found: ${filepath}`);
    return [];
  }

  const content = readFileSync(filepath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    cast: true,
    cast_date: false,
  });

  return records as T[];
}

// Parse array-like strings from CSV (e.g., "['ACTIONS', 'GHAS']")
function parseArrayString(str: string): string[] {
  if (!str || str === "" || str === "[]") return [];
  try {
    // Handle Python-style arrays
    const cleaned = str
      .replace(/'/g, '"')
      .replace(/\[|\]/g, "")
      .split(",")
      .map((s) => s.trim().replace(/"/g, ""))
      .filter((s) => s);
    return cleaned;
  } catch {
    return [];
  }
}

// Load certified users
export function getCertifiedUsers(): CertifiedUser[] {
  if (!shouldRefreshCache() && cache.certifiedUsers) {
    return cache.certifiedUsers;
  }

  const raw = parseCSV<Record<string, unknown>>("certified_users.csv");
  cache.certifiedUsers = raw.map((row) => ({
    email: String(row.email || ""),
    dotcom_id: Number(row.dotcom_id) || 0,
    user_handle: String(row.user_handle || ""),
    learner_status: (row.learner_status as LearnerStatus) || "Learning",
    journey_stage: String(row.journey_stage || ""),
    cert_product_focus: String(row.cert_product_focus || ""),
    first_cert_date: String(row.first_cert_date || ""),
    latest_cert_date: String(row.latest_cert_date || ""),
    total_certs: Number(row.total_certs) || 0,
    total_attempts: Number(row.total_attempts) || 0,
    cert_titles: parseArrayString(String(row.cert_titles || "[]")),
    exam_codes: parseArrayString(String(row.exam_codes || "[]")),
    days_since_cert: Number(row.days_since_cert) || 0,
  }));

  cache.lastLoaded = Date.now();
  return cache.certifiedUsers;
}

// Load unified users (all learners)
export function getUnifiedUsers(): UnifiedUser[] {
  if (!shouldRefreshCache() && cache.unifiedUsers) {
    return cache.unifiedUsers;
  }

  const raw = parseCSV<Record<string, unknown>>("unified_users.csv");
  cache.unifiedUsers = raw.map((row) => ({
    dotcom_id: Number(row.dotcom_id) || 0,
    email: String(row.email || ""),
    user_handle: String(row.user_handle || ""),
    total_attempts: Number(row.total_attempts) || 0,
    total_passed: Number(row.total_passed) || 0,
    total_registrations: Number(row.total_registrations) || 0,
    total_delivered: Number(row.total_delivered) || 0,
    total_no_shows: Number(row.total_no_shows) || 0,
    total_scheduled: Number(row.total_scheduled) || 0,
    total_canceled: Number(row.total_canceled) || 0,
    total_expired: Number(row.total_expired) || 0,
    first_exam_date: row.first_exam_date ? String(row.first_exam_date) : null,
    last_exam_date: row.last_exam_date ? String(row.last_exam_date) : null,
    certifications: row.certifications ? String(row.certifications) : null,
    has_certification: Boolean(row.has_certification),
    source: String(row.source || ""),
    learn_page_views: Number(row.learn_page_views) || 0,
    first_learn_visit: row.first_learn_visit ? String(row.first_learn_visit) : null,
    last_learn_visit: row.last_learn_visit ? String(row.last_learn_visit) : null,
    skills_page_views: Number(row.skills_page_views) || 0,
    first_skills_visit: row.first_skills_visit ? String(row.first_skills_visit) : null,
    last_skills_visit: row.last_skills_visit ? String(row.last_skills_visit) : null,
    docs_page_views: Number(row.docs_page_views) || 0,
    docs_sessions: Number(row.docs_sessions) || 0,
    first_docs_visit: row.first_docs_visit ? String(row.first_docs_visit) : null,
    last_docs_visit: row.last_docs_visit ? String(row.last_docs_visit) : null,
    events_registered: Number(row.events_registered) || 0,
    first_event: row.first_event ? String(row.first_event) : null,
    last_event: row.last_event ? String(row.last_event) : null,
    event_types: row.event_types ? String(row.event_types) : null,
    learner_status: (row.learner_status as LearnerStatus) || "Learning",
  }));

  cache.lastLoaded = Date.now();
  return cache.unifiedUsers;
}

// Load product usage
export function getProductUsage(): ProductUsage[] {
  if (!shouldRefreshCache() && cache.productUsage) {
    return cache.productUsage;
  }

  const raw = parseCSV<Record<string, unknown>>("product_usage.csv");
  cache.productUsage = raw.map((row) => ({
    dotcom_id: Number(row.dotcom_id) || 0,
    activity_days: Number(row.activity_days) || 0,
    copilot_events: Number(row.copilot_events) || 0,
    copilot_days: Number(row.copilot_days) || 0,
    actions_events: Number(row.actions_events) || 0,
    security_events: Number(row.security_events) || 0,
    total_events: Number(row.total_events) || 0,
    product_usage_hours: Number(row.product_usage_hours) || 0,
  }));

  cache.lastLoaded = Date.now();
  return cache.productUsage;
}

// Load learning activity
export function getLearningActivity(): LearningActivity[] {
  if (!shouldRefreshCache() && cache.learningActivity) {
    return cache.learningActivity;
  }

  const raw = parseCSV<Record<string, unknown>>("learning_activity.csv");
  cache.learningActivity = raw.map((row) => ({
    user_ref: String(row.user_ref || ""),
    page_views: Number(row.page_views) || 0,
    learning_sessions: Number(row.learning_sessions) || 0,
    learning_days: Number(row.learning_days) || 0,
    learning_hours: Number(row.learning_hours) || 0,
    first_learning: String(row.first_learning || ""),
    last_learning: String(row.last_learning || ""),
  }));

  cache.lastLoaded = Date.now();
  return cache.learningActivity;
}

// Load journey users (simulated/sample data)
export function getJourneyUsers(): JourneyUser[] {
  if (!shouldRefreshCache() && cache.journeyUsers) {
    return cache.journeyUsers;
  }

  const raw = parseCSV<Record<string, unknown>>("journey_complete.csv");
  cache.journeyUsers = raw.map((row) => ({
    user_id: Number(row.user_id) || 0,
    email: String(row.email || ""),
    journey_stage: String(row.journey_stage || ""),
    first_touch_date: String(row.first_touch_date || ""),
    cert_date: row.cert_date ? String(row.cert_date) : null,
    is_certified: row.is_certified === "True" || row.is_certified === true,
    product_focus: String(row.product_focus || ""),
    total_learning_events: Number(row.total_learning_events) || 0,
    avg_engagement_score: Number(row.avg_engagement_score) || 0,
    stage_velocity_days: {},
    time_to_certification: row.time_to_certification ? Number(row.time_to_certification) : null,
    content_completion_rate: Number(row.content_completion_rate) || 0,
    learning_path_progress: {},
    first_touch_channel: String(row.first_touch_channel || ""),
    certification_driver: String(row.certification_driver || ""),
    days_to_first_product_use: row.days_to_first_product_use
      ? Number(row.days_to_first_product_use)
      : null,
    post_cert_engagement_score: Number(row.post_cert_engagement_score) || 0,
    learning_hours: Number(row.learning_hours) || 0,
    product_usage_hours: Number(row.product_usage_hours) || 0,
    features_adopted: Number(row.features_adopted) || 0,
    product_usage_days: Number(row.product_usage_days) || 0,
    roi_multiplier: Number(row.roi_multiplier) || 0,
    active_last_30_days: row.active_last_30_days === "True" || row.active_last_30_days === true,
    primary_product_focus: String(row.primary_product_focus || ""),
    product_adoption_status: String(row.product_adoption_status || ""),
  }));

  cache.lastLoaded = Date.now();
  return cache.journeyUsers;
}

// Get dashboard metrics
export function getDashboardMetrics(): DashboardMetrics {
  const certifiedUsers = getCertifiedUsers();
  const unifiedUsers = getUnifiedUsers();
  const productUsage = getProductUsage();
  const journeyUsers = getJourneyUsers();

  const totalLearners = unifiedUsers.length;
  const certified = certifiedUsers.filter((u) => u.total_certs > 0);
  const learning = unifiedUsers.filter((u) => u.learner_status === "Learning");

  // Calculate average learning hours
  const avgLearningHours =
    journeyUsers.length > 0
      ? journeyUsers.reduce((sum, u) => sum + u.learning_hours, 0) / journeyUsers.length
      : 0;

  // Calculate average products adopted
  const avgProductsAdopted =
    journeyUsers.length > 0
      ? journeyUsers.reduce((sum, u) => sum + u.features_adopted, 0) / journeyUsers.length
      : 0;

  // Calculate usage increase (compare certified vs non-certified)
  const certifiedUsage = productUsage.filter((u) =>
    certified.some((c) => c.dotcom_id === u.dotcom_id)
  );
  const avgCertifiedHours =
    certifiedUsage.length > 0
      ? certifiedUsage.reduce((sum, u) => sum + u.product_usage_hours, 0) / certifiedUsage.length
      : 0;
  const avgAllHours =
    productUsage.length > 0
      ? productUsage.reduce((sum, u) => sum + u.product_usage_hours, 0) / productUsage.length
      : 1;
  const usageIncrease = avgAllHours > 0 ? ((avgCertifiedHours - avgAllHours) / avgAllHours) * 100 : 0;

  // Calculate retention (active in last 30 days)
  const activeCount = journeyUsers.filter((u) => u.active_last_30_days).length;
  const retentionRate = journeyUsers.length > 0 ? (activeCount / journeyUsers.length) * 100 : 0;

  // Impact score (composite metric)
  const impactScore = Math.min(
    100,
    Math.round(
      (certified.length / Math.max(totalLearners, 1)) * 30 +
        Math.min(usageIncrease, 100) * 0.4 +
        retentionRate * 0.3
    )
  );

  return {
    totalLearners,
    certifiedUsers: certified.length,
    learningUsers: learning.length,
    avgUsageIncrease: Math.round(usageIncrease),
    avgProductsAdopted: Math.round(avgProductsAdopted * 10) / 10,
    avgLearningHours: Math.round(avgLearningHours * 10) / 10,
    impactScore,
    retentionRate: Math.round(retentionRate * 10) / 10,
  };
}

// Get journey funnel data
export function getJourneyFunnel(): JourneyFunnelData[] {
  const certifiedUsers = getCertifiedUsers();
  const unifiedUsers = getUnifiedUsers();

  // Count by learner status
  const statusCounts: Record<string, number> = {
    Learning: 0,
    Certified: 0,
    "Multi-Certified": 0,
    Specialist: 0,
    Champion: 0,
  };

  // Count from unified users (includes Learning)
  unifiedUsers.forEach((u) => {
    if (u.learner_status in statusCounts) {
      statusCounts[u.learner_status]++;
    }
  });

  // Add certified users (may have more accurate counts)
  certifiedUsers.forEach((u) => {
    if (u.learner_status !== "Learning" && u.learner_status in statusCounts) {
      // Only count if not already in unified
      const inUnified = unifiedUsers.some(
        (uu) => uu.email === u.email || uu.dotcom_id === u.dotcom_id
      );
      if (!inUnified) {
        statusCounts[u.learner_status]++;
      }
    }
  });

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const stageColors: Record<string, string> = {
    Learning: "#3b82f6",
    Certified: "#22c55e",
    "Multi-Certified": "#8b5cf6",
    Specialist: "#f59e0b",
    Champion: "#ef4444",
  };

  const stageOrder = ["Learning", "Certified", "Multi-Certified", "Specialist", "Champion"];

  return stageOrder.map((stage) => ({
    stage,
    count: statusCounts[stage] || 0,
    percentage: total > 0 ? Math.round((statusCounts[stage] / total) * 100) : 0,
    color: stageColors[stage] || "#94a3b8",
  }));
}

// Get learner status breakdown
export function getLearnerStatusBreakdown(): LearnerStatusBreakdown[] {
  const certifiedUsers = getCertifiedUsers();
  const unifiedUsers = getUnifiedUsers();

  const statusCounts: Record<LearnerStatus, number> = {
    Champion: 0,
    Specialist: 0,
    "Multi-Certified": 0,
    Certified: 0,
    Learning: 0,
  };

  // Count from both sources (deduplicated by email)
  const counted = new Set<string>();

  certifiedUsers.forEach((u) => {
    if (!counted.has(u.email) && u.learner_status in statusCounts) {
      statusCounts[u.learner_status]++;
      counted.add(u.email);
    }
  });

  unifiedUsers.forEach((u) => {
    if (!counted.has(u.email) && u.learner_status in statusCounts) {
      statusCounts[u.learner_status]++;
      counted.add(u.email);
    }
  });

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return Object.entries(statusCounts).map(([status, count]) => ({
    status: status as LearnerStatus,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}

// Get learners with filtering and pagination
export function getLearners(filters: LearnerFilters = {}) {
  const certifiedUsers = getCertifiedUsers();
  const unifiedUsers = getUnifiedUsers();

  // Combine and deduplicate
  const emailMap = new Map<string, CertifiedUser | UnifiedUser>();

  // Add certified users first (more complete data)
  certifiedUsers.forEach((u) => {
    emailMap.set(u.email, u);
  });

  // Add unified users if not already present
  unifiedUsers.forEach((u) => {
    if (!emailMap.has(u.email)) {
      emailMap.set(u.email, u);
    }
  });

  let results = Array.from(emailMap.values());

  // Apply filters
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(
      (u) =>
        u.email.toLowerCase().includes(searchLower) ||
        u.user_handle.toLowerCase().includes(searchLower)
    );
  }

  if (filters.learnerStatus && filters.learnerStatus !== "all") {
    results = results.filter((u) => u.learner_status === filters.learnerStatus);
  }

  if (filters.isCertified !== undefined && filters.isCertified !== "all") {
    if (filters.isCertified) {
      results = results.filter((u) => u.learner_status !== "Learning");
    } else {
      results = results.filter((u) => u.learner_status === "Learning");
    }
  }

  const total = results.length;

  // Pagination
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const start = (page - 1) * pageSize;
  results = results.slice(start, start + pageSize);

  return {
    data: results,
    total,
    page,
    pageSize,
  };
}

// Get product adoption comparison
export function getProductAdoptionComparison() {
  const productUsage = getProductUsage();
  const certifiedUsers = getCertifiedUsers();

  const certifiedIds = new Set(certifiedUsers.map((u) => u.dotcom_id));

  const certified = productUsage.filter((u) => certifiedIds.has(u.dotcom_id));
  const learning = productUsage.filter((u) => !certifiedIds.has(u.dotcom_id));

  const avgCertified = (arr: ProductUsage[], key: keyof ProductUsage) =>
    arr.length > 0 ? arr.reduce((sum, u) => sum + Number(u[key]), 0) / arr.length : 0;
  const avgLearning = (arr: ProductUsage[], key: keyof ProductUsage) =>
    arr.length > 0 ? arr.reduce((sum, u) => sum + Number(u[key]), 0) / arr.length : 0;

  return {
    copilot: {
      before: Math.round(avgLearning(learning, "copilot_days")),
      after: Math.round(avgCertified(certified, "copilot_days")),
    },
    actions: {
      before: Math.round(avgLearning(learning, "actions_events") / 100),
      after: Math.round(avgCertified(certified, "actions_events") / 100),
    },
    security: {
      before: Math.round(avgLearning(learning, "security_events")),
      after: Math.round(avgCertified(certified, "security_events")),
    },
    totalUsage: {
      before: Math.round(avgLearning(learning, "product_usage_hours")),
      after: Math.round(avgCertified(certified, "product_usage_hours")),
    },
  };
}
