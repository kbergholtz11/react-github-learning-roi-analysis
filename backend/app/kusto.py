"""Kusto (Azure Data Explorer) client for live queries."""

import logging
from datetime import datetime, timedelta
from typing import Any

from azure.identity import DefaultAzureCredential
from azure.kusto.data import KustoClient, KustoConnectionStringBuilder
from azure.kusto.data.exceptions import KustoServiceError
from cachetools import TTLCache

from app.config import get_settings

logger = logging.getLogger(__name__)


class KustoService:
    """Service for executing Kusto queries against Azure Data Explorer."""

    def __init__(self):
        self.settings = get_settings()
        self._client: KustoClient | None = None
        self._cache = TTLCache(maxsize=100, ttl=self.settings.cache_ttl)

    @property
    def client(self) -> KustoClient | None:
        """Lazy-initialize Kusto client."""
        if not self.settings.kusto_enabled:
            return None

        if self._client is None:
            try:
                # Use service principal if credentials provided
                if (
                    self.settings.azure_tenant_id
                    and self.settings.azure_client_id
                    and self.settings.azure_client_secret
                ):
                    kcsb = KustoConnectionStringBuilder.with_aad_application_key_authentication(
                        self.settings.kusto_cluster_url,
                        self.settings.azure_client_id,
                        self.settings.azure_client_secret,
                        self.settings.azure_tenant_id,
                    )
                else:
                    # Use DefaultAzureCredential (works with managed identity, CLI, etc.)
                    credential = DefaultAzureCredential()
                    kcsb = KustoConnectionStringBuilder.with_azure_token_credential(
                        self.settings.kusto_cluster_url,
                        credential,
                    )

                self._client = KustoClient(kcsb)
                logger.info(f"Connected to Kusto cluster: {self.settings.kusto_cluster_url}")
            except Exception as e:
                logger.error(f"Failed to connect to Kusto: {e}")
                raise

        return self._client

    @property
    def is_available(self) -> bool:
        """Check if Kusto client is available."""
        return self.client is not None

    def execute_query(
        self,
        query: str,
        parameters: dict[str, Any] | None = None,
        use_cache: bool = True,
    ) -> list[dict]:
        """
        Execute a Kusto query and return results as list of dicts.

        Args:
            query: KQL query string
            parameters: Optional query parameters
            use_cache: Whether to use cached results

        Returns:
            List of row dictionaries
        """
        if not self.client:
            raise RuntimeError("Kusto client not available")

        # Create cache key
        cache_key = f"{query}:{parameters}"
        if use_cache and cache_key in self._cache:
            logger.debug(f"Cache hit for query: {query[:50]}...")
            return self._cache[cache_key]

        try:
            start_time = datetime.now()

            # Execute query
            response = self.client.execute(self.settings.kusto_database, query)

            # Convert to list of dicts
            rows = []
            for table in response.primary_results:
                columns = [col.column_name for col in table.columns]
                for row in table:
                    rows.append(dict(zip(columns, row)))

            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(f"Query executed in {elapsed:.2f}ms, returned {len(rows)} rows")

            # Cache results
            if use_cache:
                self._cache[cache_key] = rows

            return rows

        except KustoServiceError as e:
            logger.error(f"Kusto query failed: {e}")
            raise

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
    def get_learners_by_status(status: str | None = None, limit: int = 100) -> str:
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


# Singleton instance
_kusto_service: KustoService | None = None


def get_kusto_service() -> KustoService:
    """Get the Kusto service singleton."""
    global _kusto_service
    if _kusto_service is None:
        _kusto_service = KustoService()
    return _kusto_service
