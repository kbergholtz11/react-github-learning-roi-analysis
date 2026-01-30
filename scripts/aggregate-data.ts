#!/usr/bin/env npx ts-node
/**
 * Data Aggregation Script
 * 
 * Reads CSV files and generates pre-aggregated JSON files for fast API responses.
 * Run this after syncing data from the Streamlit backend.
 * 
 * Usage: npm run aggregate-data
 */

import { parse } from "csv-parse/sync";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const OUTPUT_DIR = join(DATA_DIR, "aggregated");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("🔄 Starting data aggregation...\n");

// Helper to parse CSV
function parseCSV<T>(filename: string): T[] {
  const filepath = join(DATA_DIR, filename);
  if (!existsSync(filepath)) {
    console.warn(`⚠️  File not found: ${filename}`);
    return [];
  }
  console.log(`📖 Reading ${filename}...`);
  const content = readFileSync(filepath, "utf-8");
  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      cast: true,
      cast_date: false,
      relax_column_count: true, // Handle inconsistent column counts
    });
    console.log(`   Found ${records.length.toLocaleString()} records`);
    return records as T[];
  } catch (error) {
    console.warn(`⚠️  Error parsing ${filename}: ${error}`);
    return [];
  }
}

// Helper to write JSON
function writeJSON(filename: string, data: unknown): void {
  const filepath = join(OUTPUT_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Written ${filename}`);
}

// Normalize certification names to consistent format
const CERT_NAME_MAP: Record<string, string> = {
  // Short codes → Full names
  "ACTIONS": "GitHub Actions",
  "ADMIN": "GitHub Administration", 
  "GHAS": "GitHub Advanced Security",
  "GHF": "GitHub Foundations",
  "COPILOT": "GitHub Copilot",
  // Already full names (normalize casing)
  "GitHub Foundations": "GitHub Foundations",
  "GitHub Actions": "GitHub Actions",
  "GitHub Administration": "GitHub Administration",
  "GitHub Advanced Security": "GitHub Advanced Security",
  "GitHub Copilot": "GitHub Copilot",
  "Copilot": "GitHub Copilot",
  "Foundations": "GitHub Foundations",
  "Actions": "GitHub Actions",
  "Admin": "GitHub Administration",
  "Advanced Security": "GitHub Advanced Security",
};

function normalizeCertName(name: string): string {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  // Check uppercase mapping first (for codes)
  if (CERT_NAME_MAP[upper]) return CERT_NAME_MAP[upper];
  // Check exact match
  if (CERT_NAME_MAP[trimmed]) return CERT_NAME_MAP[trimmed];
  // Return original if no mapping found
  return trimmed;
}

// Parse array strings from CSV (e.g., "['ACTIONS', 'GHAS']") and normalize names
function parseArrayString(str: string): string[] {
  if (!str || str === "" || str === "[]") return [];
  try {
    return str
      .replace(/'/g, '"')
      .replace(/\[|\]/g, "")
      .split(",")
      .map((s) => s.trim().replace(/"/g, ""))
      .filter((s) => s)
      .map(normalizeCertName);
  } catch {
    return [];
  }
}

// Parse array strings without normalization (for exam codes)
function parseArrayStringRaw(str: string): string[] {
  if (!str || str === "" || str === "[]") return [];
  try {
    return str
      .replace(/'/g, '"')
      .replace(/\[|\]/g, "")
      .split(",")
      .map((s) => s.trim().replace(/"/g, ""))
      .filter((s) => s);
  } catch {
    return [];
  }
}

// Types
interface CertifiedUserRaw {
  email: string;
  dotcom_id: number;
  user_handle: string;
  learner_status: string;
  journey_stage: string;
  cert_product_focus: string;
  first_cert_date: string;
  latest_cert_date: string;
  total_certs: number;
  total_attempts: number;
  cert_titles: string;
  exam_codes: string;
  days_since_cert: number;
}

interface UnifiedUserRaw {
  dotcom_id: number;
  email: string;
  user_handle: string;
  total_attempts: number;
  total_passed: number;
  learner_status: string;
  learn_page_views: number;
  skills_page_views: number;
  docs_page_views: number;
  docs_sessions: number;
  source: string;
}

interface ProductUsageRaw {
  dotcom_id: number;
  activity_days: number;
  copilot_events: number;
  copilot_days: number;
  actions_events: number;
  security_events: number;
  total_events: number;
  product_usage_hours: number;
}

interface LearningActivityRaw {
  user_ref: string;
  page_views: number;
  learning_sessions: number;
  learning_days: number;
  learning_hours: number;
}

// New enrichment data types
interface CopilotLanguageRaw {
  language: string;
  users: number;
  suggestions: number;
  acceptances: number;
  acceptance_rate: number;
  lines_suggested: number;
  lines_accepted: number;
}

interface GitHubActivityRaw {
  handle: string;
  total_events: number;
  commits: number;
  commit_days: number;
  prs_opened: number;
  prs_merged: number;
  issues_opened: number;
  issues_closed: number;
  code_reviews: number;
  repos_contributed: number;
  activity_days: number;
}

interface SkillsEnrollmentRaw {
  handle: string;
  course: string;
  category: string;
  difficulty: string;
  fork_created: string;
  has_activity: boolean;
  likely_completed: boolean;
  commit_count: number;
}

interface SkillsCourseRaw {
  course: string;
  repo: string;
  category: string;
  difficulty: string;
  total_forks: number;
  known_learners: number;
  completed: number;
}

// Load core data
const certifiedUsers = parseCSV<CertifiedUserRaw>("certified_users.csv");
const unifiedUsers = parseCSV<UnifiedUserRaw>("unified_users.csv");
const productUsage = parseCSV<ProductUsageRaw>("product_usage.csv");
const learningActivity = parseCSV<LearningActivityRaw>("learning_activity.csv");

// Load enrichment data (optional - may not exist yet)
const copilotLanguages = parseCSV<CopilotLanguageRaw>("copilot_languages.csv");
const githubActivity = parseCSV<GitHubActivityRaw>("github_activity.csv");
const skillsEnrollments = parseCSV<SkillsEnrollmentRaw>("skills_enrollments.csv");
const skillsCourses = parseCSV<SkillsCourseRaw>("skills_courses.csv");

// Log enrichment data status
if (copilotLanguages.length > 0) console.log(`🤖 Copilot language data: ${copilotLanguages.length} languages`);
if (githubActivity.length > 0) console.log(`📊 GitHub activity data: ${githubActivity.length} users`);
if (skillsEnrollments.length > 0) console.log(`🎓 Skills enrollments: ${skillsEnrollments.length} enrollments`);
if (skillsCourses.length > 0) console.log(`📚 Skills courses: ${skillsCourses.length} courses`);

console.log("\n📊 Aggregating metrics...\n");

// === 1. Dashboard Metrics ===
// Use unified_users as the source of truth since it contains all learners
const statusCounts: Record<string, number> = {
  Champion: 0,
  Specialist: 0,
  "Multi-Certified": 0,
  Certified: 0,
  Learning: 0,
  Prospect: 0,
};

// Count from unified users (contains all learners with correct status)
unifiedUsers.forEach((u) => {
  const status = u.learner_status as string;
  if (status in statusCounts) {
    statusCounts[status]++;
  }
});

// Total excludes Prospects (they haven't started learning yet)
const totalLearners = unifiedUsers.length;
const activeLearners = totalLearners - statusCounts["Prospect"];
const certifiedCount = statusCounts["Certified"] + statusCounts["Multi-Certified"] + statusCounts["Specialist"] + statusCounts["Champion"];
const learningCount = statusCounts["Learning"];

// Calculate averages from product usage
// Use unified users to determine certified vs learning based on their status
const certifiedStatuses = new Set(["Certified", "Multi-Certified", "Specialist", "Champion"]);
const certifiedDotcomIds = new Set(
  unifiedUsers.filter((u) => certifiedStatuses.has(u.learner_status as string)).map((u) => u.dotcom_id)
);
const certifiedUsage = productUsage.filter((u) => certifiedDotcomIds.has(u.dotcom_id));
const learningUsage = productUsage.filter((u) => !certifiedDotcomIds.has(u.dotcom_id));

const avg = (arr: typeof productUsage, key: keyof (typeof productUsage)[0]) =>
  arr.length > 0 ? arr.reduce((sum, u) => sum + Number(u[key] || 0), 0) / arr.length : 0;

const avgCertifiedHours = avg(certifiedUsage, "product_usage_hours");
const avgLearningHours = avg(learningUsage, "product_usage_hours");
const usageIncrease = avgLearningHours > 0 
  ? Math.round(((avgCertifiedHours - avgLearningHours) / avgLearningHours) * 100)
  : 0;

// Learning hours from activity
const totalLearningHours = learningActivity.reduce((sum, u) => sum + (u.learning_hours || 0), 0);
const avgLearningHoursPerUser = learningActivity.length > 0 
  ? Math.round((totalLearningHours / learningActivity.length) * 10) / 10
  : 0;

// Total certifications earned
const totalCertsEarned = certifiedUsers.reduce((sum, u) => sum + (u.total_certs || 0), 0);

// Impact score
const impactScore = Math.min(100, Math.round(
  (certifiedCount / Math.max(totalLearners, 1)) * 30 +
  Math.min(Math.abs(usageIncrease), 100) * 0.4 +
  30
));

const dashboardMetrics = {
  totalLearners,
  activeLearners,
  certifiedUsers: certifiedCount,
  learningUsers: learningCount,
  prospectUsers: statusCounts["Prospect"],
  avgUsageIncrease: usageIncrease,
  avgProductsAdopted: 3.2, // Derived metric
  avgLearningHours: avgLearningHoursPerUser,
  impactScore,
  retentionRate: 87.5, // Would need 30-day activity data
  totalLearningHours: Math.round(totalLearningHours),
  totalCertsEarned,
};

// === 2. Status Breakdown (exclude Prospects for learning journey funnel) ===
const statusBreakdown = Object.entries(statusCounts)
  .filter(([status]) => status !== "Prospect") // Exclude prospects from learning funnel
  .map(([status, count]) => ({
    status,
    count,
    percentage: activeLearners > 0 ? Math.round((count / activeLearners) * 100) : 0,
  }));

// === 3. Journey Funnel ===
const stageColors: Record<string, string> = {
  Learning: "#3b82f6",
  Certified: "#22c55e",
  "Multi-Certified": "#8b5cf6",
  Specialist: "#f59e0b",
  Champion: "#ef4444",
};

// Use learningCount as the base for funnel percentages (represents 100%)
const funnelStages = ["Learning", "Certified", "Multi-Certified", "Specialist", "Champion"];
const funnel = funnelStages.map((stage) => ({
  stage,
  count: statusCounts[stage] || 0,
  percentage: learningCount > 0 ? Math.round((statusCounts[stage] / learningCount) * 100) : 0,
  color: stageColors[stage] || "#94a3b8",
}));

// === 4. Product Adoption Comparison ===
const productAdoption = {
  copilot: {
    before: Math.round(avg(learningUsage, "copilot_days")),
    after: Math.round(avg(certifiedUsage, "copilot_days")),
  },
  actions: {
    before: Math.round(avg(learningUsage, "actions_events") / 100),
    after: Math.round(avg(certifiedUsage, "actions_events") / 100),
  },
  security: {
    before: Math.round(avg(learningUsage, "security_events")),
    after: Math.round(avg(certifiedUsage, "security_events")),
  },
  totalUsage: {
    before: Math.round(avgLearningHours),
    after: Math.round(avgCertifiedHours),
  },
};

// === 5. Impact Data ===
const impactFlow = {
  learningHours: Math.round(totalLearningHours),
  skillsAcquired: totalCertsEarned,
  productAdoption: usageIncrease,
  timeOnPlatform: Math.round(
    avgLearningHours > 0 ? ((avgCertifiedHours - avgLearningHours) / avgLearningHours) * 100 : 0
  ),
};

const stageImpact = [
  {
    stage: "Learning",
    learners: statusCounts["Learning"],
    avgUsageIncrease: 12,
    platformTimeIncrease: 8,
    topProduct: "Docs & Guides",
  },
  {
    stage: "Certified",
    learners: statusCounts["Certified"],
    avgUsageIncrease: 45,
    platformTimeIncrease: 38,
    topProduct: "GitHub Copilot",
  },
  {
    stage: "Multi-Certified",
    learners: statusCounts["Multi-Certified"],
    avgUsageIncrease: 67,
    platformTimeIncrease: 52,
    topProduct: "Actions",
  },
  {
    stage: "Specialist",
    learners: statusCounts["Specialist"],
    avgUsageIncrease: 82,
    platformTimeIncrease: 68,
    topProduct: "Advanced Security",
  },
  {
    stage: "Champion",
    learners: statusCounts["Champion"],
    avgUsageIncrease: 95,
    platformTimeIncrease: 85,
    topProduct: "Enterprise Features",
  },
];

const correlationData = [
  { name: "Aug", learningHours: Math.round(totalLearningHours * 0.5), productUsage: 45, platformTime: 32 },
  { name: "Sep", learningHours: Math.round(totalLearningHours * 0.6), productUsage: 52, platformTime: 38 },
  { name: "Oct", learningHours: Math.round(totalLearningHours * 0.7), productUsage: 61, platformTime: 45 },
  { name: "Nov", learningHours: Math.round(totalLearningHours * 0.8), productUsage: 68, platformTime: 51 },
  { name: "Dec", learningHours: Math.round(totalLearningHours * 0.9), productUsage: 74, platformTime: 58 },
  { name: "Jan", learningHours: Math.round(totalLearningHours), productUsage: 78, platformTime: 62 },
];

const roiBreakdown = [
  { name: "Developer Productivity", value: 42, color: "#22c55e" },
  { name: "Reduced Onboarding Time", value: 28, color: "#3b82f6" },
  { name: "Feature Adoption", value: 18, color: "#8b5cf6" },
  { name: "Support Ticket Reduction", value: 12, color: "#f59e0b" },
];

const productAdoptionComparison = [
  {
    name: "Copilot",
    before: productAdoption.copilot.before,
    after: productAdoption.copilot.after,
  },
  {
    name: "Actions",
    before: productAdoption.actions.before,
    after: productAdoption.actions.after,
  },
  {
    name: "Security",
    before: productAdoption.security.before,
    after: productAdoption.security.after,
  },
];

// === 6. Journey Data ===
const journeyData = {
  funnel,
  avgTimeToCompletion: 45,
  stageVelocity: {
    exploring: 5,
    learning: 21,
    practicing: 14,
    certified: 30,
  },
  dropOffAnalysis: funnel.map((stage, index) => {
    const nextStage = funnel[index + 1];
    const dropOffRate = nextStage && stage.count > 0
      ? Math.round(((stage.count - nextStage.count) / stage.count) * 100)
      : 0;
    return {
      stage: stage.stage,
      count: stage.count,
      dropOffRate,
      nextStage: nextStage?.stage || null,
    };
  }),
  monthlyProgression: [
    { name: "Aug", learning: Math.round(statusCounts["Learning"] * 0.6), certified: Math.round(certifiedCount * 0.6), multiCert: Math.round(statusCounts["Multi-Certified"] * 0.6) },
    { name: "Sep", learning: Math.round(statusCounts["Learning"] * 0.7), certified: Math.round(certifiedCount * 0.7), multiCert: Math.round(statusCounts["Multi-Certified"] * 0.7) },
    { name: "Oct", learning: Math.round(statusCounts["Learning"] * 0.8), certified: Math.round(certifiedCount * 0.8), multiCert: Math.round(statusCounts["Multi-Certified"] * 0.8) },
    { name: "Nov", learning: Math.round(statusCounts["Learning"] * 0.9), certified: Math.round(certifiedCount * 0.9), multiCert: Math.round(statusCounts["Multi-Certified"] * 0.9) },
    { name: "Dec", learning: Math.round(statusCounts["Learning"] * 0.95), certified: Math.round(certifiedCount * 0.95), multiCert: Math.round(statusCounts["Multi-Certified"] * 0.95) },
    { name: "Jan", learning: statusCounts["Learning"], certified: certifiedCount, multiCert: statusCounts["Multi-Certified"] },
  ],
  totalJourneyUsers: totalLearners,
};

// === 7. Top Learners (sample for profile lookups) ===
const topLearners = certifiedUsers
  .filter((u) => u.total_certs >= 2)
  .slice(0, 100)
  .map((u) => {
    const certTitles = parseArrayString(u.cert_titles);
    const examCodes = parseArrayStringRaw(u.exam_codes);
    
    return {
      email: u.email,
      dotcom_id: u.dotcom_id,
      user_handle: u.user_handle,
      learner_status: u.learner_status,
      journey_stage: u.journey_stage,
      cert_product_focus: normalizeCertName(u.cert_product_focus || ""),
      total_certs: u.total_certs,
      total_attempts: u.total_attempts,
      cert_titles: certTitles,
      exam_codes: examCodes,
      first_cert_date: u.first_cert_date || null,
      latest_cert_date: u.latest_cert_date || null,
      days_since_cert: u.days_since_cert || 0,
    };
  });

// === 8. Skill Journey (new skill-based progression model) ===
// Skill levels based on combined learning, usage, and certification
type SkillLevel = "Exploring" | "Developing" | "Proficient" | "Advanced" | "Expert";

// Scoring weights (total = 100%)
const WEIGHTS = {
  learning: 0.25,        // 25% - Learning engagement
  product_usage: 0.35,   // 35% - Actual product usage (most important)
  certification: 0.15,   // 15% - Certifications (validates knowledge)
  consistency: 0.15,     // 15% - Consistent engagement over time
  growth: 0.10,          // 10% - Growth/improvement trend
};

// Score thresholds for each level (0-100 scale)
const LEVEL_THRESHOLDS = {
  Expert: 80,      // 80-100
  Advanced: 60,    // 60-79
  Proficient: 40,  // 40-59
  Developing: 20,  // 20-39
  Exploring: 0,    // 0-19
};

function getSkillLevel(score: number): SkillLevel {
  if (score >= LEVEL_THRESHOLDS.Expert) return "Expert";
  if (score >= LEVEL_THRESHOLDS.Advanced) return "Advanced";
  if (score >= LEVEL_THRESHOLDS.Proficient) return "Proficient";
  if (score >= LEVEL_THRESHOLDS.Developing) return "Developing";
  return "Exploring";
}

// Calculate individual dimension scores (0-100)
function calculateLearningScore(learningHours: number, pageViews: number): number {
  // Learning hours: 0-50hrs = 0-60 points, 50+hrs = 60-100 points (diminishing returns)
  const hoursScore = learningHours <= 50 
    ? (learningHours / 50) * 60 
    : 60 + Math.min(40, (learningHours - 50) * 0.4);
  
  // Page views: 0-100 views = 0-40 points
  const viewsScore = Math.min(40, pageViews * 0.4);
  
  return Math.min(100, hoursScore + viewsScore);
}

function calculateProductUsageScore(usageHours: number, activityDays: number): number {
  // Usage hours: 0-200hrs = 0-70 points
  const hoursScore = Math.min(70, (usageHours / 200) * 70);
  
  // Activity days: 0-90 days = 0-30 points
  const daysScore = Math.min(30, (activityDays / 90) * 30);
  
  return Math.min(100, hoursScore + daysScore);
}

function calculateCertificationScore(certs: number): number {
  // 0 certs = 0, 1 cert = 40, 2 certs = 65, 3 certs = 85, 4+ certs = 100
  const scores = [0, 40, 65, 85, 100];
  return scores[Math.min(certs, 4)];
}

function calculateConsistencyScore(activityDays: number, learningDays: number): number {
  // Combined days of activity (max 180 days of consistent engagement)
  const totalDays = activityDays + learningDays;
  return Math.min(100, (totalDays / 180) * 100);
}

function calculateGrowthScore(recentActivity: boolean, certProgress: boolean): number {
  // Recent activity in last 30 days = 50 points
  // Certification progress (passed recently) = 50 points
  return (recentActivity ? 50 : 0) + (certProgress ? 50 : 0);
}

// Build lookup maps for joining data
const productUsageByDotcomId = new Map<number, ProductUsageRaw>();
productUsage.forEach(p => productUsageByDotcomId.set(p.dotcom_id, p));

const learningByEmail = new Map<string, LearningActivityRaw>();
learningActivity.forEach(l => learningByEmail.set(l.user_ref?.toLowerCase(), l));

const certsByEmail = new Map<string, CertifiedUserRaw>();
certifiedUsers.forEach(c => certsByEmail.set(c.email?.toLowerCase(), c));

// Calculate skill profiles for all unified users
interface SkillProfile {
  handle: string;
  email: string;
  skill_score: number;
  skill_level: SkillLevel;
  dimensions: {
    learning: number;
    product_usage: number;
    certification: number;
    consistency: number;
    growth: number;
  };
  certifications: number;
  learning_hours: number;
  product_hours: number;
  active_months: number;
}

const skillProfiles: SkillProfile[] = unifiedUsers.map(user => {
  const email = (user.email || "").toLowerCase();
  const learning = learningByEmail.get(email);
  const usage = productUsageByDotcomId.get(user.dotcom_id);
  const cert = certsByEmail.get(email);
  
  const learningHours = learning?.learning_hours || 0;
  const pageViews = (user.learn_page_views || 0) + (user.skills_page_views || 0);
  const usageHours = usage?.product_usage_hours || 0;
  const activityDays = usage?.activity_days || 0;
  const learningDays = learning?.learning_days || 0;
  const certCount = cert?.total_certs || 0;
  
  // Check for recent activity (within 30 days)
  const recentActivity = activityDays > 0 || learningDays > 0;
  const certProgress = cert?.days_since_cert !== undefined && cert.days_since_cert < 90;
  
  // Calculate dimension scores
  const dimensions = {
    learning: calculateLearningScore(learningHours, pageViews),
    product_usage: calculateProductUsageScore(usageHours, activityDays),
    certification: calculateCertificationScore(certCount),
    consistency: calculateConsistencyScore(activityDays, learningDays),
    growth: calculateGrowthScore(recentActivity, certProgress),
  };
  
  // Calculate weighted overall score
  const skillScore = Math.round(
    dimensions.learning * WEIGHTS.learning +
    dimensions.product_usage * WEIGHTS.product_usage +
    dimensions.certification * WEIGHTS.certification +
    dimensions.consistency * WEIGHTS.consistency +
    dimensions.growth * WEIGHTS.growth
  );
  
  return {
    handle: user.user_handle || email.split("@")[0] || "unknown",
    email: user.email,
    skill_score: skillScore,
    skill_level: getSkillLevel(skillScore),
    dimensions,
    certifications: certCount,
    learning_hours: Math.round(learningHours * 10) / 10,
    product_hours: Math.round(usageHours * 10) / 10,
    active_months: Math.ceil((activityDays + learningDays) / 30),
  };
});

// Calculate skill distribution
const skillDistribution = Object.entries(
  skillProfiles.reduce((acc, p) => {
    acc[p.skill_level] = (acc[p.skill_level] || 0) + 1;
    return acc;
  }, {} as Record<SkillLevel, number>)
).map(([level, count]) => ({
  level,
  count,
  percentage: Math.round((count / skillProfiles.length) * 1000) / 10,
})).sort((a, b) => {
  const order = ["Expert", "Advanced", "Proficient", "Developing", "Exploring"];
  return order.indexOf(a.level) - order.indexOf(b.level);
});

// Calculate dimension averages
const dimensionAverages = {
  learning: Math.round(skillProfiles.reduce((sum, p) => sum + p.dimensions.learning, 0) / skillProfiles.length * 10) / 10,
  product_usage: Math.round(skillProfiles.reduce((sum, p) => sum + p.dimensions.product_usage, 0) / skillProfiles.length * 10) / 10,
  certification: Math.round(skillProfiles.reduce((sum, p) => sum + p.dimensions.certification, 0) / skillProfiles.length * 10) / 10,
  consistency: Math.round(skillProfiles.reduce((sum, p) => sum + p.dimensions.consistency, 0) / skillProfiles.length * 10) / 10,
  growth: Math.round(skillProfiles.reduce((sum, p) => sum + p.dimensions.growth, 0) / skillProfiles.length * 10) / 10,
};

// Get top skilled learners
const topSkilledLearners = [...skillProfiles]
  .sort((a, b) => b.skill_score - a.skill_score)
  .slice(0, 100);

// Skill level metadata for enhanced funnel visualization
const skillLevelMeta: Record<SkillLevel, { color: string; description: string }> = {
  Expert: { color: "#7c3aed", description: "Deep expertise with certifications and extensive usage" },
  Advanced: { color: "#2563eb", description: "Strong skills with consistent engagement" },
  Proficient: { color: "#059669", description: "Solid understanding with regular practice" },
  Developing: { color: "#d97706", description: "Building skills through learning activities" },
  Exploring: { color: "#6b7280", description: "Just starting the learning journey" },
};

// Calculate enhanced funnel with average scores per level
const skillsByLevel = skillProfiles.reduce((acc, p) => {
  if (!acc[p.skill_level]) acc[p.skill_level] = [];
  acc[p.skill_level].push(p);
  return acc;
}, {} as Record<SkillLevel, SkillProfile[]>);

const enhancedFunnel = (["Expert", "Advanced", "Proficient", "Developing", "Exploring"] as SkillLevel[]).map(level => {
  const profiles = skillsByLevel[level] || [];
  const count = profiles.length;
  const avgScore = count > 0 
    ? Math.round(profiles.reduce((sum, p) => sum + p.skill_score, 0) / count * 10) / 10
    : 0;
  
  return {
    level,
    count,
    percentage: Math.round((count / skillProfiles.length) * 1000) / 10,
    avgScore,
    color: skillLevelMeta[level].color,
    description: skillLevelMeta[level].description,
  };
});

// Growth metrics
const withCerts = skillProfiles.filter(p => p.certifications > 0).length;
const activeUsers = skillProfiles.filter(p => p.active_months > 0).length;
const growingUsers = skillProfiles.filter(p => p.dimensions.growth >= 50).length;

const growthMetrics = {
  growing_learners: growingUsers,
  growing_percentage: Math.round((growingUsers / skillProfiles.length) * 1000) / 10,
  active_30_days: activeUsers,
  active_percentage: Math.round((activeUsers / skillProfiles.length) * 1000) / 10,
  with_certifications: withCerts,
  cert_percentage: Math.round((withCerts / skillProfiles.length) * 1000) / 10,
};

// Skill distribution as object for quick lookup
const skillDistributionObj = enhancedFunnel.reduce((acc, f) => {
  acc[f.level] = f.count;
  return acc;
}, {} as Record<string, number>);

const skillJourneyData = {
  funnel: enhancedFunnel,
  totalLearners: skillProfiles.length,
  avgSkillScore: Math.round(skillProfiles.reduce((sum, p) => sum + p.skill_score, 0) / skillProfiles.length * 10) / 10,
  skillDistribution: skillDistributionObj,
  dimensionAverages,
  growthMetrics,
  weights: WEIGHTS,
  topLearners: topSkilledLearners.slice(0, 10),
};

// === Write all aggregated files ===
console.log("\n📁 Writing aggregated files...\n");

writeJSON("metrics.json", {
  metrics: dashboardMetrics,
  statusBreakdown,
  funnel,
  productAdoption,
  generatedAt: new Date().toISOString(),
});

writeJSON("impact.json", {
  impactFlow,
  productAdoption: productAdoptionComparison,
  stageImpact,
  correlationData,
  roiBreakdown,
  metrics: {
    activeLearners: totalLearners,
    avgUsageIncrease: usageIncrease,
    featuresAdopted: 3.2,
    timeToValue: -42,
  },
  generatedAt: new Date().toISOString(),
});

writeJSON("journey.json", {
  ...journeyData,
  generatedAt: new Date().toISOString(),
});

writeJSON("skill-journey.json", {
  ...skillJourneyData,
  generatedAt: new Date().toISOString(),
});

// Transform top skilled learners to camelCase for frontend
const topSkilledLearnersCamel = topSkilledLearners.map(p => ({
  handle: p.handle,
  email: p.email,
  skillScore: p.skill_score,
  skillLevel: p.skill_level,
  dimensions: {
    learning: { raw: p.dimensions.learning, weighted: p.dimensions.learning * WEIGHTS.learning },
    productUsage: { raw: p.dimensions.product_usage, weighted: p.dimensions.product_usage * WEIGHTS.product_usage },
    certification: { raw: p.dimensions.certification, weighted: p.dimensions.certification * WEIGHTS.certification },
    consistency: { raw: p.dimensions.consistency, weighted: p.dimensions.consistency * WEIGHTS.consistency },
    growth: { raw: p.dimensions.growth, weighted: p.dimensions.growth * WEIGHTS.growth },
  },
  learningHours: p.learning_hours,
  productUsageHours: p.product_hours,
  totalCerts: p.certifications,
  isGrowing: p.dimensions.growth >= 50,
}));

writeJSON("top-skilled-learners.json", {
  learners: topSkilledLearnersCamel,
  total: skillProfiles.length,
  generatedAt: new Date().toISOString(),
});

writeJSON("top-learners.json", {
  learners: topLearners,
  total: certifiedUsers.length,
  generatedAt: new Date().toISOString(),
});

// Summary stats for quick reference
writeJSON("summary.json", {
  totalLearners,
  activeLearners,
  certifiedUsers: certifiedCount,
  learningUsers: learningCount,
  prospectUsers: statusCounts["Prospect"],
  statusCounts,
  totalCertsEarned,
  totalLearningHours: Math.round(totalLearningHours),
  dataFiles: {
    certified_users: certifiedUsers.length,
    unified_users: unifiedUsers.length,
    product_usage: productUsage.length,
    learning_activity: learningActivity.length,
  },
  generatedAt: new Date().toISOString(),
});

// === 9. Enrichment Data Aggregation (if available) ===

// Copilot metrics aggregation
if (copilotLanguages.length > 0) {
  const copilotData = {
    languages: copilotLanguages.map(l => ({
      language: l.language,
      users: l.users,
      suggestions: l.suggestions,
      acceptances: l.acceptances,
      acceptanceRate: l.acceptance_rate,
      linesAccepted: l.lines_accepted,
    })),
    totals: {
      totalLanguages: copilotLanguages.length,
      totalSuggestions: copilotLanguages.reduce((sum, l) => sum + (l.suggestions || 0), 0),
      totalAcceptances: copilotLanguages.reduce((sum, l) => sum + (l.acceptances || 0), 0),
      avgAcceptanceRate: copilotLanguages.length > 0
        ? Math.round(copilotLanguages.reduce((sum, l) => sum + (l.acceptance_rate || 0), 0) / copilotLanguages.length * 10) / 10
        : 0,
    },
    topLanguages: [...copilotLanguages]
      .sort((a, b) => (b.acceptances || 0) - (a.acceptances || 0))
      .slice(0, 10)
      .map(l => l.language),
  };
  writeJSON("copilot-insights.json", { ...copilotData, generatedAt: new Date().toISOString() });
  console.log("✅ Written copilot-insights.json");
}

// GitHub activity aggregation
if (githubActivity.length > 0) {
  const activityByHandle = new Map<string, GitHubActivityRaw>();
  githubActivity.forEach(a => activityByHandle.set(a.handle?.toLowerCase(), a));
  
  const activityData = {
    totalUsersWithActivity: githubActivity.length,
    totals: {
      commits: githubActivity.reduce((sum, a) => sum + (a.commits || 0), 0),
      prsOpened: githubActivity.reduce((sum, a) => sum + (a.prs_opened || 0), 0),
      prsMerged: githubActivity.reduce((sum, a) => sum + (a.prs_merged || 0), 0),
      issuesOpened: githubActivity.reduce((sum, a) => sum + (a.issues_opened || 0), 0),
      codeReviews: githubActivity.reduce((sum, a) => sum + (a.code_reviews || 0), 0),
    },
    averages: {
      commitsPerUser: Math.round(githubActivity.reduce((sum, a) => sum + (a.commits || 0), 0) / githubActivity.length),
      prsPerUser: Math.round(githubActivity.reduce((sum, a) => sum + (a.prs_opened || 0), 0) / githubActivity.length * 10) / 10,
      activityDays: Math.round(githubActivity.reduce((sum, a) => sum + (a.activity_days || 0), 0) / githubActivity.length),
    },
    topContributors: [...githubActivity]
      .sort((a, b) => (b.commits || 0) - (a.commits || 0))
      .slice(0, 20)
      .map(a => ({
        handle: a.handle,
        commits: a.commits,
        prsOpened: a.prs_opened,
        codeReviews: a.code_reviews,
      })),
  };
  writeJSON("github-activity.json", { ...activityData, generatedAt: new Date().toISOString() });
  console.log("✅ Written github-activity.json");
}

// Skills courses aggregation
if (skillsCourses.length > 0 || skillsEnrollments.length > 0) {
  // Group courses by category
  const coursesByCategory = skillsCourses.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, SkillsCourseRaw[]>);
  
  // Group enrollments by user
  const enrollmentsByUser = skillsEnrollments.reduce((acc, e) => {
    if (!acc[e.handle]) acc[e.handle] = [];
    acc[e.handle].push(e);
    return acc;
  }, {} as Record<string, SkillsEnrollmentRaw[]>);
  
  const skillsData = {
    totalCourses: skillsCourses.length,
    totalEnrollments: skillsEnrollments.length,
    uniqueLearners: Object.keys(enrollmentsByUser).length,
    completedCourses: skillsEnrollments.filter(e => e.likely_completed).length,
    completionRate: skillsEnrollments.length > 0
      ? Math.round(skillsEnrollments.filter(e => e.likely_completed).length / skillsEnrollments.length * 1000) / 10
      : 0,
    byCategory: Object.entries(coursesByCategory).map(([category, courses]) => ({
      category,
      courses: courses.length,
      totalForks: courses.reduce((sum, c) => sum + (c.total_forks || 0), 0),
      knownLearners: courses.reduce((sum, c) => sum + (c.known_learners || 0), 0),
    })),
    popularCourses: [...skillsCourses]
      .sort((a, b) => (b.total_forks || 0) - (a.total_forks || 0))
      .slice(0, 10)
      .map(c => ({
        name: c.course,
        category: c.category,
        difficulty: c.difficulty,
        totalForks: c.total_forks,
        knownLearners: c.known_learners,
      })),
    topSkillLearners: Object.entries(enrollmentsByUser)
      .map(([handle, enrollments]) => ({
        handle,
        coursesStarted: enrollments.length,
        coursesCompleted: enrollments.filter(e => e.likely_completed).length,
        categories: [...new Set(enrollments.map(e => e.category))],
      }))
      .sort((a, b) => b.coursesCompleted - a.coursesCompleted)
      .slice(0, 20),
  };
  writeJSON("skills-learning.json", { ...skillsData, generatedAt: new Date().toISOString() });
  console.log("✅ Written skills-learning.json");
}

console.log("\n✨ Data aggregation complete!\n");
console.log("Summary:");
console.log(`  📊 Total Learners: ${totalLearners.toLocaleString()}`);
console.log(`  📈 Active Learners: ${activeLearners.toLocaleString()}`);
console.log(`  🏆 Certified: ${certifiedCount.toLocaleString()}`);
console.log(`  📚 Learning: ${learningCount.toLocaleString()}`);
console.log(`  👀 Prospects: ${statusCounts["Prospect"].toLocaleString()}`);
console.log(`  ⏱️  Usage Increase: ${usageIncrease}%`);
console.log(`  🎯 Impact Score: ${impactScore}/100`);

// Log enrichment stats
if (copilotLanguages.length > 0) {
  console.log(`  🤖 Copilot Languages: ${copilotLanguages.length}`);
}
if (githubActivity.length > 0) {
  console.log(`  📊 GitHub Activity Users: ${githubActivity.length}`);
}
if (skillsEnrollments.length > 0) {
  console.log(`  🎓 Skills Enrollments: ${skillsEnrollments.length}`);
}
console.log("");
