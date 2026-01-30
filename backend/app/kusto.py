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
    """Pre-built queries for learner data."""

    @staticmethod
    def get_learners_by_status(status: Optional[str] = None, limit: int = 100) -> str:
        """Query learners optionally filtered by status."""
        base = """
        CertifiedUsers
        | project email, user_handle, learner_status, journey_stage, 
                  total_certs, first_cert_date, latest_cert_date, cert_titles
        """
        if status:
            base += f"| where learner_status == '{status}'\n"
        base += f"| take {limit}"
        return base

    @staticmethod
    def get_learner_by_email(email: str) -> str:
        """Query a specific learner by email."""
        return f"""
        CertifiedUsers
        | where email == '{email}'
        | project email, user_handle, learner_status, journey_stage,
                  total_certs, first_cert_date, latest_cert_date, cert_titles,
                  exam_codes, days_since_cert, cert_product_focus
        """

    @staticmethod
    def search_learners(search_term: str, limit: int = 50) -> str:
        """Search learners by email or handle."""
        return f"""
        CertifiedUsers
        | where email contains '{search_term}' or user_handle contains '{search_term}'
        | project email, user_handle, learner_status, journey_stage, total_certs
        | take {limit}
        """

    @staticmethod
    def get_certification_stats() -> str:
        """Get certification statistics."""
        return """
        CertifiedUsers
        | summarize 
            total_certified = count(),
            total_certs = sum(total_certs),
            avg_certs_per_user = avg(total_certs),
            champions = countif(learner_status == 'Champion'),
            specialists = countif(learner_status == 'Specialist'),
            multi_certified = countif(learner_status == 'Multi-Certified'),
            certified = countif(learner_status == 'Certified')
        """

    @staticmethod
    def get_individual_exams_by_email(email: str) -> str:
        """Query individual exam records for a specific learner.
        
        Returns all exam attempts with dates, scores, and pass status.
        Unions FY22-25 and FY26 exam data sources.
        """
        return f"""
        // FY22-25: gh-analytics.ace.exam_results
        let FY22_25 = cluster('gh-analytics.eastus.kusto.windows.net').database('ace').exam_results
            | where tolower(email) == '{email.lower()}'
            | extend 
                exam_code = examcode,
                exam_name = examname,
                exam_date = endtime,
                passed = passed,
                attempt_number = 1
            | project exam_code, exam_name, exam_date, passed, attempt_number;

        // FY26: cse-analytics.ACE.pearson_exam_results
        let FY26 = cluster('cse-analytics.centralus.kusto.windows.net').database('ACE').pearson_exam_results
            | where tolower(['Candidate Email']) == '{email.lower()}'
            | extend 
                exam_code = ['Exam Series Code'],
                exam_name = ['Exam Title'],
                exam_date = Date,
                passed = iff(['Total Passed'] > 0, true, false),
                attempt_number = 1
            | project exam_code, exam_name, exam_date, passed, attempt_number;

        // Union and dedupe by exam_code + exam_date
        union FY22_25, FY26
        | summarize 
            exam_name = take_any(exam_name),
            passed = max(passed),
            attempt_number = count()
          by exam_code, exam_date
        | order by exam_date asc
        | extend row_num = row_number()
        | project 
            exam_code,
            exam_name,
            exam_date,
            passed,
            attempt_number = row_num
        """


class JourneyQueries:
    """Pre-built queries for journey analytics."""

    @staticmethod
    def get_funnel_counts() -> str:
        """Get learner counts by journey stage."""
        return """
        UnifiedUsers
        | summarize count() by learner_status
        | order by count_ desc
        """

    @staticmethod
    def get_monthly_progression(months: int = 6) -> str:
        """Get monthly progression data."""
        return f"""
        CertifiedUsers
        | where first_cert_date != ''
        | extend cert_month = startofmonth(todatetime(first_cert_date))
        | where cert_month >= ago({months * 30}d)
        | summarize 
            certified = count(),
            multi_cert = countif(total_certs > 1)
          by cert_month
        | order by cert_month asc
        """

    @staticmethod
    def get_time_to_certification() -> str:
        """Get average time to certification by stage."""
        return """
        JourneyUsers
        | where time_to_certification > 0
        | summarize 
            avg_days = avg(time_to_certification),
            median_days = percentile(time_to_certification, 50),
            p90_days = percentile(time_to_certification, 90)
          by journey_stage
        | order by avg_days asc
        """


class ImpactQueries:
    """Pre-built queries for impact analytics."""

    @staticmethod
    def get_product_usage_by_stage() -> str:
        """Get product usage metrics by journey stage."""
        return """
        JourneyUsers
        | join kind=inner (
            ProductUsage
            | project dotcom_id = dotcom_id, 
                      copilot_events, actions_events, security_events,
                      product_usage_hours
        ) on $left.user_id == $right.dotcom_id
        | summarize 
            learners = count(),
            avg_copilot = avg(copilot_events),
            avg_actions = avg(actions_events),
            avg_security = avg(security_events),
            avg_usage_hours = avg(product_usage_hours)
          by journey_stage
        | order by avg_usage_hours desc
        """

    @staticmethod
    def get_learning_impact_correlation() -> str:
        """Get correlation between learning hours and product usage."""
        return """
        JourneyUsers
        | where learning_hours > 0 and product_usage_hours > 0
        | summarize 
            count = count(),
            avg_learning = avg(learning_hours),
            avg_usage = avg(product_usage_hours),
            correlation = round(stdev(learning_hours * product_usage_hours) / 
                               (stdev(learning_hours) * stdev(product_usage_hours)), 2)
        """


class CopilotQueries:
    """Pre-built queries for Copilot analytics (GH copilot database)."""

    @staticmethod
    def get_copilot_adoption_stats() -> str:
        """Get Copilot adoption statistics."""
        return """
        CopilotUsage
        | summarize 
            total_users = dcount(user_id),
            active_users = dcountif(user_id, last_active > ago(30d)),
            total_suggestions = sum(suggestions_accepted),
            total_completions = sum(completions),
            avg_acceptance_rate = avg(acceptance_rate)
        """

    @staticmethod
    def get_copilot_usage_by_language() -> str:
        """Get Copilot usage broken down by programming language."""
        return """
        CopilotUsage
        | where language != ''
        | summarize 
            users = dcount(user_id),
            suggestions = sum(suggestions_accepted),
            completions = sum(completions),
            avg_acceptance = avg(acceptance_rate)
          by language
        | top 10 by completions desc
        """

    @staticmethod
    def get_copilot_trend(days: int = 30) -> str:
        """Get Copilot usage trend over time."""
        return f"""
        CopilotUsage
        | where timestamp > ago({days}d)
        | summarize 
            active_users = dcount(user_id),
            completions = sum(completions),
            acceptance_rate = avg(acceptance_rate)
          by bin(timestamp, 1d)
        | order by timestamp asc
        """

    @staticmethod
    def get_copilot_impact_by_learner_status() -> str:
        """Get Copilot usage correlated with learning status."""
        return """
        CopilotUsage
        | join kind=leftouter (
            UnifiedUsers
            | project user_id, learner_status, journey_stage
        ) on user_id
        | summarize 
            users = dcount(user_id),
            avg_completions = avg(completions),
            avg_acceptance = avg(acceptance_rate)
          by learner_status
        | order by avg_completions desc
        """


class HydroQueries:
    """Pre-built queries for Hydro analytics (telemetry/events)."""

    @staticmethod
    def get_event_counts_by_type(days: int = 7) -> str:
        """Get event counts by type."""
        return f"""
        Events
        | where timestamp > ago({days}d)
        | summarize count = count() by event_type
        | top 20 by count desc
        """

    @staticmethod
    def get_daily_active_users(days: int = 30) -> str:
        """Get daily active user counts."""
        return f"""
        Events
        | where timestamp > ago({days}d)
        | summarize dau = dcount(user_id) by bin(timestamp, 1d)
        | order by timestamp asc
        """


# Singleton instance
_kusto_service: Optional[KustoService] = None


def get_kusto_service() -> KustoService:
    """Get the Kusto service singleton."""
    global _kusto_service
    if _kusto_service is None:
        _kusto_service = KustoService()
    return _kusto_service
