"""Kusto (Azure Data Explorer) client for live queries."""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
from azure.kusto.data.exceptions import KustoServiceError
from cachetools import TTLCache

from app.config import get_settings, CLUSTER_CSE, CLUSTER_GH

logger = logging.getLogger(__name__)


class KustoService:
    """Service for executing Kusto queries against multiple Azure Data Explorer clusters."""

    def __init__(self):
        self.settings = get_settings()
        self._clients: Dict[str, KustoClient] = {}
        self._cache = TTLCache(maxsize=100, ttl=self.settings.cache_ttl)
        self._credential: Optional[DefaultAzureCredential] = None

    def _get_credential(self) -> DefaultAzureCredential:
        """Get or create shared credential."""
        if self._credential is None:
            self._credential = DefaultAzureCredential()
        return self._credential

    def _get_client(self, cluster_name: str) -> Optional[KustoClient]:
        """Get or create a Kusto client for a specific cluster."""
        if cluster_name in self._clients:
            return self._clients[cluster_name]

        clusters = self.settings.clusters
        if cluster_name not in clusters:
            logger.error(f"Unknown cluster: {cluster_name}. Available: {list(clusters.keys())}")
            return None

        cluster_config = clusters[cluster_name]
        cluster_url = cluster_config["url"]

        try:
            # Use service principal if credentials provided
            if (
                self.settings.azure_tenant_id
                and self.settings.azure_client_id
                and self.settings.azure_client_secret
            ):
                kcsb = KustoConnectionStringBuilder.with_aad_application_key_authentication(
                    cluster_url,
                    self.settings.azure_client_id,
                    self.settings.azure_client_secret,
                    self.settings.azure_tenant_id,
                )
            else:
                # Use DefaultAzureCredential (works with managed identity, CLI, etc.)
                kcsb = KustoConnectionStringBuilder.with_azure_token_credential(
                    cluster_url,
                    self._get_credential(),
                )

            client = KustoClient(kcsb)
            self._clients[cluster_name] = client
            logger.info(f"Connected to Kusto cluster '{cluster_name}': {cluster_url}")
            return client

        except Exception as e:
            logger.error(f"Failed to connect to Kusto cluster '{cluster_name}': {e}")
            raise

    @property
    def client(self) -> Optional[KustoClient]:
        """Get the default Kusto client (backwards compatible)."""
        default = self.settings.default_cluster
        if default:
            return self._get_client(default)
        return None

    @property
    def is_available(self) -> bool:
        """Check if any Kusto client is available."""
        return self.settings.kusto_enabled and self.settings.default_cluster is not None

    @property
    def available_clusters(self) -> List[str]:
        """Get list of available cluster names."""
        return list(self.settings.clusters.keys())

    def get_database(self, cluster_name: Optional[str] = None) -> str:
        """Get database name for a cluster."""
        cluster = cluster_name or self.settings.default_cluster
        if cluster and cluster in self.settings.clusters:
            return self.settings.clusters[cluster]["database"]
        return self.settings.kusto_database

    def execute_query(
        self,
        query: str,
        parameters: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
        cluster: Optional[str] = None,
        database: Optional[str] = None,
    ) -> List[dict]:
        """
        Execute a Kusto query and return results as list of dicts.

        Args:
            query: KQL query string
            parameters: Optional query parameters
            use_cache: Whether to use cached results
            cluster: Cluster name ('cse', 'gh', or 'default'). Uses default if not specified.
            database: Database name. Uses cluster's default database if not specified.

        Returns:
            List of row dictionaries
        """
        # Determine cluster and database
        cluster_name = cluster or self.settings.default_cluster
        if not cluster_name:
            raise RuntimeError("No Kusto cluster configured")

        client = self._get_client(cluster_name)
        if not client:
            raise RuntimeError(f"Kusto client not available for cluster: {cluster_name}")

        # Get database (override or cluster default)
        db = database or self.get_database(cluster_name)

        # Create cache key including cluster and database
        cache_key = f"{cluster_name}:{db}:{query}:{parameters}"
        if use_cache and cache_key in self._cache:
            logger.debug(f"Cache hit for query on {cluster_name}/{db}: {query[:50]}...")
            return self._cache[cache_key]

        try:
            start_time = datetime.now()

            # Execute query
            response = client.execute(db, query)

            # Convert to list of dicts
            rows = []
            for table in response.primary_results:
                columns = [col.column_name for col in table.columns]
                for row in table:
                    rows.append(dict(zip(columns, row)))

            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(f"Query on {cluster_name}/{db} executed in {elapsed:.2f}ms, returned {len(rows)} rows")

            # Cache results
            if use_cache:
                self._cache[cache_key] = rows

            return rows

        except KustoServiceError as e:
            logger.error(f"Kusto query failed on {cluster_name}/{db}: {e}")
            raise

    def execute_on_cse(
        self,
        query: str,
        database: Optional[str] = None,
        use_cache: bool = True,
    ) -> List[dict]:
        """Execute query on CSE Analytics cluster."""
        return self.execute_query(query, cluster=CLUSTER_CSE, database=database, use_cache=use_cache)

    def execute_on_gh(
        self,
        query: str,
        database: Optional[str] = None,
        use_cache: bool = True,
    ) -> List[dict]:
        """Execute query on GH Analytics cluster (default database: ace)."""
        return self.execute_query(query, cluster=CLUSTER_GH, database=database, use_cache=use_cache)

    # GH Analytics cluster - specific database helpers
    def execute_on_gh_ace(self, query: str, use_cache: bool = True) -> List[dict]:
        """Execute query on GH Analytics cluster - ACE database."""
        return self.execute_query(query, cluster=CLUSTER_GH, database="ace", use_cache=use_cache)

    def execute_on_gh_copilot(self, query: str, use_cache: bool = True) -> List[dict]:
        """Execute query on GH Analytics cluster - Copilot database."""
        return self.execute_query(query, cluster=CLUSTER_GH, database="copilot", use_cache=use_cache)

    def execute_on_gh_hydro(self, query: str, use_cache: bool = True) -> List[dict]:
        """Execute query on GH Analytics cluster - Hydro database."""
        return self.execute_query(query, cluster=CLUSTER_GH, database="hydro", use_cache=use_cache)

    def execute_on_gh_snapshots(self, query: str, use_cache: bool = True) -> List[dict]:
        """Execute query on GH Analytics cluster - Snapshots database."""
        return self.execute_query(query, cluster=CLUSTER_GH, database="snapshots", use_cache=use_cache)

    @property
    def gh_databases(self) -> List[str]:
        """Get list of available GH databases."""
        return self.settings.gh_databases_list

    def clear_cache(self):
        """Clear the query cache."""
        self._cache.clear()
        logger.info("Kusto cache cleared")


# =============================================================================
# Pre-built Queries
# =============================================================================


class LearnerQueries:
    """Pre-built queries for learner data.

    These query real Kusto tables:
    - ace database: exam_results, certifications, users (on gh-analytics)
    - ACE database: pearson_exam_results (on cse-analytics)

    For enriched learner queries, use database.py LearnerQueries (DuckDB).
    """

    # Cluster/database hints for callers
    CLUSTER = CLUSTER_GH
    DATABASE = "ace"

    @staticmethod
    def get_learners_by_status(status: Optional[str] = None, limit: int = 100) -> str:
        """Query learners from ace.exam_results with certification status."""
        status_filter = ""
        if status:
            status_map = {
                "Champion": "exams_passed >= 4",
                "Specialist": "exams_passed >= 3 and exams_passed < 4",
                "Multi-Certified": "exams_passed >= 2 and exams_passed < 3",
                "Certified": "exams_passed == 1",
                "Learning": "total_exams > 0 and exams_passed == 0",
            }
            if status in status_map:
                status_filter = f"| where {status_map[status]}"
        return f"""
        exam_results
        | where passed == true
        | summarize
            exams_passed = count(),
            total_exams = count(),
            cert_names = make_set(examname, 10),
            first_cert = min(endtime),
            last_cert = max(endtime)
          by email = tolower(email), userhandle
        | extend learner_status = case(
            exams_passed >= 4, "Champion",
            exams_passed >= 3, "Specialist",
            exams_passed >= 2, "Multi-Certified",
            exams_passed == 1, "Certified",
            "Learning"
          )
        {status_filter}
        | project email, userhandle, learner_status, exams_passed, cert_names, first_cert, last_cert
        | take {limit}
        """

    @staticmethod
    def get_learner_by_email(email: str) -> str:
        """Query a specific learner by email from ace.exam_results."""
        safe_email = email.lower().replace("'", "''")
        return f"""
        exam_results
        | where tolower(email) == '{safe_email}'
        | summarize
            total_exams = count(),
            exams_passed = countif(passed),
            cert_names = make_set_if(examname, passed, 10),
            exam_codes = make_set(examcode, 20),
            first_exam = min(endtime),
            last_exam = max(endtime)
          by email = tolower(email), userhandle
        | extend learner_status = case(
            exams_passed >= 4, "Champion",
            exams_passed >= 3, "Specialist",
            exams_passed >= 2, "Multi-Certified",
            exams_passed == 1, "Certified",
            total_exams > 0, "Learning",
            "Registered"
          )
        | project email, userhandle, learner_status,
                  total_exams, exams_passed, cert_names, exam_codes,
                  first_exam, last_exam
        """

    @staticmethod
    def search_learners(search_term: str, limit: int = 50) -> str:
        """Search learners by email or handle from ace.exam_results."""
        safe_term = search_term.replace("'", "''")
        return f"""
        exam_results
        | where tolower(email) contains '{safe_term}' or tolower(userhandle) contains '{safe_term}'
        | summarize
            exams_passed = countif(passed),
            total_exams = count()
          by email = tolower(email), userhandle
        | extend learner_status = case(
            exams_passed >= 4, "Champion",
            exams_passed >= 3, "Specialist",
            exams_passed >= 2, "Multi-Certified",
            exams_passed == 1, "Certified",
            "Learning"
          )
        | project email, userhandle, learner_status, exams_passed, total_exams
        | take {limit}
        """

    @staticmethod
    def get_certification_stats() -> str:
        """Get certification statistics from ace.exam_results."""
        return """
        exam_results
        | where passed == true
        | summarize exams_passed = count() by email = tolower(email)
        | summarize
            total_certified = count(),
            total_certs = sum(exams_passed),
            avg_certs_per_user = round(avg(exams_passed), 2),
            champions = countif(exams_passed >= 4),
            specialists = countif(exams_passed == 3),
            multi_certified = countif(exams_passed == 2),
            certified = countif(exams_passed == 1)
        """

    @staticmethod
    def get_individual_exams_by_email(email: str) -> str:
        """Query individual exam records for a specific learner.
        
        Returns all exam attempts with dates, status, scores.
        Includes all statuses: Passed, Failed, Absent, Scheduled, Rescheduled, Cancelled, Registered, Expired.
        Unions FY22-25 (comprehensive eligibility-based) and FY26 (Pearson) data sources.
        """
        return f"""
        // ============================================================================
        // FY22-FY25: Comprehensive exam records for specific learner
        // ============================================================================
        
        // Get eligibility data for this user
        let EligibilityData = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_eligibility_sent
            | extend eligibility_id = tostring(existing_eligibility_id)
            | where tolower(coalesce(user.handle, "")) == '{email.lower()}'
            | summarize arg_max(kafka_timestamp, *) by eligibility_id
            | project
                eligibility_id,
                user_handle_meta = coalesce(user.handle, ""),
                exam_name_meta   = coalesce(exam.name, ""),
                exam_code_meta   = coalesce(exam.code, ""),
                RegisteredDate   = todatetime(start_date);

        let user_eligibilities = EligibilityData | project eligibility_id;

        // Scheduled exams
        let ScheduledExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_scheduled
            | where tostring(eligibility_id) in (user_eligibilities)
            | project eligibility_id = tostring(eligibility_id), ExamDate = todatetime(scheduled_for),
                Status = "Scheduled", exam_timestamp = timestamp, examname_event = coalesce(exam.name, ""),
                examcode_event = coalesce(exam.code, ""), RoundedScore = real(null);

        // Rescheduled exams
        let RescheduledExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_rescheduled
            | where tostring(eligibility_id) in (user_eligibilities)
            | project eligibility_id = tostring(eligibility_id), ExamDate = todatetime(rescheduled_for),
                Status = "Rescheduled", exam_timestamp = timestamp, examname_event = coalesce(exam.name, ""),
                examcode_event = coalesce(exam.code, ""), RoundedScore = real(null);

        // Cancelled exams
        let CancelledExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_cancelled
            | where tostring(eligibility_id) in (user_eligibilities)
            | project eligibility_id = tostring(eligibility_id), ExamDate = todatetime(cancelled_on),
                Status = "Cancelled", exam_timestamp = timestamp, examname_event = coalesce(exam.name, ""),
                examcode_event = coalesce(exam.code, ""), RoundedScore = real(null);

        // Absent exams
        let AbsentExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').ace_v0_exam_absent
            | where tostring(eligibility_id) in (user_eligibilities)
            | project eligibility_id = tostring(eligibility_id), ExamDate = todatetime(absent_on),
                Status = "Absent", exam_timestamp = timestamp, examname_event = coalesce(exam.name, ""),
                examcode_event = coalesce(exam.code, ""), RoundedScore = real(null);

        // Completed exams with scores
        let CompletedExams = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
            | where tolower(userhandle) == '{email.lower()}' or tolower(email) == '{email.lower()}'
            | extend RoundedScore = iif(correct+incorrect > 0, round((todouble(correct)/(correct+incorrect))*100,2), real(null))
            | project eligibility_id = tostring(eligibilityid), ExamDate = todatetime(endtime),
                Status = iff(passed, "Passed", "Failed"), exam_timestamp = updateddate,
                examname_event = coalesce(examname, ""), examcode_event = coalesce(examcode, ""), RoundedScore;

        // Registered exams
        let RegisteredExams = EligibilityData
            | project eligibility_id, ExamDate = RegisteredDate, Status = "Registered",
                exam_timestamp = RegisteredDate, examname_event = exam_name_meta,
                examcode_event = exam_code_meta, RoundedScore = real(null);

        // Combine all FY22-25 records
        let FY22_25 = union ScheduledExams, RescheduledExams, CancelledExams, AbsentExams, CompletedExams, RegisteredExams
            | join kind=leftouter EligibilityData on eligibility_id
            | extend
                exam_name = coalesce(exam_name_meta, examname_event),
                exam_code = coalesce(exam_code_meta, examcode_event),
                exam_status = iif(Status=="Registered" and ExamDate < ago(60d), "Expired Registration", Status)
            | where exam_name !in ("GHAS 2024 Beta","UGWG")
            | project exam_code, exam_name, exam_date = ExamDate, exam_status, score_percent = RoundedScore;

        // ============================================================================
        // FY26: Pearson exam results
        // ============================================================================
        let FY26 = cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
            | where tolower(['Candidate Email']) == '{email.lower()}'
            | extend 
                exam_code = ['Exam Series Code'],
                exam_name = ['Exam Title'],
                exam_date = Date,
                exam_status = case(
                    ['Total Passed'] > 0, "Passed",
                    ['Total Failed'] > 0, "Failed",
                    ['Registration Status'] == "No Show", "No Show",
                    ['Registration Status'] == "Scheduled", "Scheduled",
                    ['Registration Status'] == "Canceled", "Canceled",
                    ['Registration Status']
                ),
                score_percent = todouble(Score)
            | project exam_code, exam_name, exam_date, exam_status, score_percent;

        // Union all exam records
        union FY22_25, FY26
        | order by exam_date asc
        | extend attempt_number = row_number()
        | project exam_code, exam_name, exam_date, exam_status, score_percent, attempt_number
        """


class JourneyQueries:
    """Pre-built queries for journey analytics.

    Uses ace.exam_results and ace.users on gh-analytics cluster.
    """

    CLUSTER = CLUSTER_GH
    DATABASE = "ace"

    @staticmethod
    def get_funnel_counts() -> str:
        """Get learner counts by journey stage from ace.exam_results + ace.users."""
        return """
        // Combine exam takers with all registered users
        let exam_users = exam_results
            | summarize
                exams_passed = countif(passed),
                total_exams = count()
              by email = tolower(email)
            | extend learner_status = case(
                exams_passed >= 4, "Champion",
                exams_passed >= 3, "Specialist",
                exams_passed >= 2, "Multi-Certified",
                exams_passed == 1, "Certified",
                total_exams > 0, "Learning",
                "Registered"
              );
        let all_users = users
            | summarize count() by email = tolower(email)
            | extend learner_status = "Registered";
        // Use exam_users as base, add registered-only users
        let combined = union
            (exam_users | project email, learner_status),
            (all_users | where email !in (exam_users | project email) | project email, learner_status);
        combined
        | summarize count() by learner_status
        | order by count_ desc
        """

    @staticmethod
    def get_monthly_progression(months: int = 6) -> str:
        """Get monthly certification progression from ace.exam_results."""
        return f"""
        exam_results
        | where passed == true
        | extend cert_month = startofmonth(endtime)
        | where cert_month >= ago({months * 30}d)
        | summarize
            certified_exams = count(),
            unique_certifiers = dcount(tolower(email))
          by cert_month
        | order by cert_month asc
        """

    @staticmethod
    def get_time_to_certification() -> str:
        """Get time between first and subsequent certifications."""
        return """
        exam_results
        | where passed == true
        | extend email_lower = tolower(email)
        | summarize
            first_cert = min(endtime),
            last_cert = max(endtime),
            exams_passed = count()
          by email_lower
        | where exams_passed > 1
        | extend days_between = datetime_diff('day', last_cert, first_cert)
        | extend learner_status = case(
            exams_passed >= 4, "Champion",
            exams_passed >= 3, "Specialist",
            exams_passed >= 2, "Multi-Certified",
            "Certified"
          )
        | summarize
            avg_days = round(avg(days_between), 1),
            median_days = round(percentile(days_between, 50), 1),
            p90_days = round(percentile(days_between, 90), 1),
            learner_count = count()
          by learner_status
        | order by avg_days asc
        """


class ImpactQueries:
    """Pre-built queries for impact analytics.

    Cross-references ace.exam_results with canonical.user_daily_activity_per_product
    to measure correlation between learning and product adoption.
    """

    CLUSTER = CLUSTER_GH

    @staticmethod
    def get_product_usage_by_cert_status() -> str:
        """Get product usage metrics grouped by certification status.

        Runs on canonical database, cross-references ace for cert data.
        """
        return """
        // Get certified user dotcom_ids from ace
        let cert_data = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
            | where passed == true
            | summarize exams_passed = count() by email = tolower(email)
            | join kind=inner (
                cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
                | where dotcomid > 0
                | project email = tolower(email), dotcom_id = tolong(dotcomid)
            ) on email
            | extend learner_status = case(
                exams_passed >= 4, "Champion",
                exams_passed >= 3, "Specialist",
                exams_passed >= 2, "Multi-Certified",
                exams_passed == 1, "Certified",
                "Learning"
              )
            | project dotcom_id, learner_status, exams_passed;
        // Get product usage for these users (last 90 days)
        let usage = user_daily_activity_per_product
            | where day >= ago(90d)
            | where user_id in (cert_data | project dotcom_id)
            | summarize
                copilot_events = sumif(num_engagement_events, product has "Copilot"),
                actions_events = sumif(num_engagement_events, product == "Actions"),
                security_events = sumif(num_engagement_events, product has_any ("Security", "Dependabot", "CodeQL")),
                total_active_days = dcount(day)
              by user_id;
        // Join and aggregate
        cert_data
        | join kind=leftouter usage on $left.dotcom_id == $right.user_id
        | summarize
            learners = count(),
            avg_copilot_events = round(avg(coalesce(copilot_events, 0)), 1),
            avg_actions_events = round(avg(coalesce(actions_events, 0)), 1),
            avg_security_events = round(avg(coalesce(security_events, 0)), 1),
            avg_active_days = round(avg(coalesce(total_active_days, 0)), 1),
            copilot_adoption_pct = round(100.0 * countif(copilot_events > 0) / count(), 1)
          by learner_status
        | order by learners desc
        """

    @staticmethod
    def get_learning_impact_correlation() -> str:
        """Compare product adoption rates: certified vs non-certified learners."""
        return """
        // Get all ACE users with cert status
        let ace_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | project dotcom_id = tolong(dotcomid), email = tolower(email);
        let cert_counts = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
            | where passed == true
            | summarize exams_passed = count() by email = tolower(email);
        let users_with_certs = ace_users
            | join kind=leftouter cert_counts on email
            | extend
                is_certified = coalesce(exams_passed, 0) > 0,
                cert_group = case(
                    coalesce(exams_passed, 0) >= 2, "Multi-Certified",
                    coalesce(exams_passed, 0) == 1, "Certified",
                    "Not Certified"
                );
        // Get product usage
        let usage = user_daily_activity_per_product
            | where day >= ago(90d)
            | where user_id in (users_with_certs | project dotcom_id)
            | summarize
                total_events = sum(num_engagement_events),
                active_days = dcount(day),
                uses_copilot = dcountif(day, product has "Copilot") > 0
              by user_id;
        users_with_certs
        | join kind=leftouter usage on $left.dotcom_id == $right.user_id
        | summarize
            total_users = count(),
            with_activity = countif(total_events > 0),
            with_copilot = countif(uses_copilot),
            avg_events = round(avg(coalesce(total_events, 0)), 1),
            avg_active_days = round(avg(coalesce(active_days, 0)), 1)
          by cert_group
        | extend
            activity_pct = round(100.0 * with_activity / total_users, 1),
            copilot_pct = round(100.0 * with_copilot / total_users, 1)
        | order by cert_group asc
        """


class CopilotQueries:
    """Pre-built queries for Copilot analytics.

    Uses copilot.copilot_unified_engagement on gh-analytics cluster.
    Schema: user_dotcom_id (long), copilot_product_pillar, copilot_product_feature,
            editor, language_id, num_events, day
    
    All queries filter to only include users from the ACE learning program.
    """

    CLUSTER = CLUSTER_GH
    DATABASE = "copilot"

    @staticmethod
    def _get_learner_ids_cte() -> str:
        """Common CTE to get learner dotcom IDs from ACE database."""
        return """
        let learner_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | distinct dotcom_id = tolong(dotcomid);
        """

    @staticmethod
    def get_copilot_adoption_stats() -> str:
        """Get Copilot adoption statistics from copilot_unified_engagement for learners only."""
        return """
        let learner_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | distinct dotcom_id = tolong(dotcomid);
        copilot_unified_engagement
        | where user_dotcom_id in (learner_ids)
        | summarize
            total_users = dcount(user_dotcom_id),
            active_30d = dcountif(user_dotcom_id, day >= ago(30d)),
            active_7d = dcountif(user_dotcom_id, day >= ago(7d)),
            total_events = sum(num_events),
            total_days_tracked = dcount(day)
        """

    @staticmethod
    def get_copilot_usage_by_language() -> str:
        """Get Copilot usage broken down by programming language for learners only."""
        return """
        let learner_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | distinct dotcom_id = tolong(dotcomid);
        copilot_unified_engagement
        | where user_dotcom_id in (learner_ids)
        | where isnotempty(language_id)
        | summarize
            users = dcount(user_dotcom_id),
            events = sum(num_events),
            active_days = dcount(day)
          by language_id
        | top 15 by events desc
        """

    @staticmethod
    def get_copilot_trend(days: int = 30) -> str:
        """Get Copilot usage trend over time for learners only."""
        return f"""
        let learner_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | distinct dotcom_id = tolong(dotcomid);
        copilot_unified_engagement
        | where user_dotcom_id in (learner_ids)
        | where day >= ago({days}d)
        | summarize
            active_users = dcount(user_dotcom_id),
            total_events = sum(num_events)
          by day
        | order by day asc
        """

    @staticmethod
    def get_copilot_by_product_pillar() -> str:
        """Get Copilot usage broken down by product pillar and feature for learners only."""
        return """
        let learner_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | distinct dotcom_id = tolong(dotcomid);
        copilot_unified_engagement
        | where user_dotcom_id in (learner_ids)
        | where day >= ago(30d)
        | summarize
            users = dcount(user_dotcom_id),
            events = sum(num_events)
          by copilot_product_pillar, copilot_product_feature
        | order by events desc
        """

    @staticmethod
    def get_copilot_by_editor() -> str:
        """Get Copilot usage broken down by editor for learners only."""
        return """
        let learner_ids = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | distinct dotcom_id = tolong(dotcomid);
        copilot_unified_engagement
        | where user_dotcom_id in (learner_ids)
        | where day >= ago(30d) and isnotempty(editor)
        | summarize
            users = dcount(user_dotcom_id),
            events = sum(num_events)
          by editor
        | order by users desc
        """

    @staticmethod
    def get_copilot_impact_by_learner_status() -> str:
        """Get Copilot usage correlated with learning/certification status."""
        return """
        // Get cert status for ACE users
        let cert_data = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
            | where passed == true
            | summarize exams_passed = count() by email = tolower(email);
        let ace_users = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').users
            | where dotcomid > 0
            | project email = tolower(email), dotcom_id = tolong(dotcomid);
        let users_with_status = ace_users
            | join kind=leftouter cert_data on email
            | extend learner_status = case(
                coalesce(exams_passed, 0) >= 4, "Champion",
                coalesce(exams_passed, 0) >= 3, "Specialist",
                coalesce(exams_passed, 0) >= 2, "Multi-Certified",
                coalesce(exams_passed, 0) == 1, "Certified",
                "Not Certified"
              )
            | project dotcom_id, learner_status;
        // Join with Copilot engagement
        copilot_unified_engagement
        | where day >= ago(90d)
        | where user_dotcom_id in (users_with_status | project dotcom_id)
        | summarize
            total_events = sum(num_events),
            active_days = dcount(day)
          by user_dotcom_id
        | join kind=inner users_with_status on $left.user_dotcom_id == $right.dotcom_id
        | summarize
            users = count(),
            avg_events = round(avg(total_events), 1),
            avg_active_days = round(avg(active_days), 1)
          by learner_status
        | order by avg_events desc
        """


# NOTE: HydroQueries class was removed - routes/hydro.py uses inline queries
# See routes/hydro.py for Hydro analytics implementation


# Singleton instance
_kusto_service: Optional[KustoService] = None


def get_kusto_service() -> KustoService:
    """Get the Kusto service singleton."""
    global _kusto_service
    if _kusto_service is None:
        _kusto_service = KustoService()
    return _kusto_service
