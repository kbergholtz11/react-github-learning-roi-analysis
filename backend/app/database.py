"""
DuckDB Database Service for Fast Learner Queries

Provides blazing-fast in-memory queries over Parquet files using DuckDB.
Query latency: <20ms for most operations.

=============================================================================
DATA LINEAGE (from github/data learn-data.md)
=============================================================================

This service queries data that originated from GitHub's canonical tables:

PRIMARY DATA (learners_enriched.parquet):
  - canonical.accounts_all: User demographics, plan info
    https://data.githubapp.com/warehouse/hive/canonical/accounts_all
  - canonical.relationships_all: User↔Org relationships
    https://data.githubapp.com/warehouse/hive/canonical/relationships_all  
  - canonical.account_hierarchy_global_all: Company/customer attribution
    https://data.githubapp.com/warehouse/hive/canonical/account_hierarchy_global_all
  - canonical.user_daily_activity_per_product: Product usage (Copilot, Actions)
    https://data.githubapp.com/warehouse/hive/canonical/user_daily_activity_per_product
  - hydro.analytics_v0_page_view: Skills/Learn page views (~90d Kusto, 7mo+ Trino)
  - ace.exam_results: Certification exam data (gh-analytics + cse-analytics)

KEY COLUMNS:
  - dotcom_id: GitHub user ID (primary key for joins)
  - global_id: Account global ID (for canonical hierarchy joins)
  - customer_name: Billing customer (most authoritative company attribution)
  - salesforce_account_name: CRM account name

RETENTION:
  - Canonical tables: 2+ years historical
  - Hydro tables (Kusto): ~90 days hot cache
  - Hydro tables (Trino): 7+ months (requires Production VPN)

For data questions: https://github.com/github/data/issues/new?labels=Data+Request
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import duckdb
import pandas as pd

from app.config import get_settings

logger = logging.getLogger(__name__)

# Data directory
DATA_DIR = Path(__file__).parent.parent.parent / "data"


class LearnerDatabase:
    """
    DuckDB-based database service for fast learner queries.
    
    Loads Parquet files into an in-memory DuckDB database for
    sub-millisecond query performance.
    """

    def __init__(self):
        """Initialize DuckDB connection and load data."""
        self.settings = get_settings()
        self._conn: Optional[duckdb.DuckDBPyConnection] = None
        self._tables_loaded: set = set()

    @property
    def conn(self) -> duckdb.DuckDBPyConnection:
        """Get or create DuckDB connection."""
        if self._conn is None:
            self._conn = duckdb.connect(":memory:")
            self._load_parquet_files()
        return self._conn

    def _load_parquet_files(self):
        """Load all Parquet files as virtual tables."""
        parquet_files = list(DATA_DIR.glob("*.parquet"))
        
        if not parquet_files:
            logger.warning(f"No Parquet files found in {DATA_DIR}")
            return

        for pq_file in parquet_files:
            table_name = pq_file.stem.replace("-", "_").replace(".", "_")
            try:
                self._conn.execute(f"""
                    CREATE OR REPLACE VIEW {table_name} AS 
                    SELECT * FROM read_parquet('{pq_file}')
                """)
                self._tables_loaded.add(table_name)
                logger.info(f"Loaded table: {table_name} from {pq_file.name}")
            except Exception as e:
                logger.error(f"Failed to load {pq_file}: {e}")

        # Also load CSV files as fallback
        csv_files = list(DATA_DIR.glob("*.csv"))
        for csv_file in csv_files:
            table_name = csv_file.stem.replace("-", "_").replace(".", "_")
            if table_name not in self._tables_loaded:
                try:
                    self._conn.execute(f"""
                        CREATE OR REPLACE VIEW {table_name} AS 
                        SELECT * FROM read_csv_auto('{csv_file}')
                    """)
                    self._tables_loaded.add(table_name)
                    logger.info(f"Loaded table: {table_name} from {csv_file.name}")
                except Exception as e:
                    logger.debug(f"Skipped CSV {csv_file}: {e}")

    @property
    def tables(self) -> List[str]:
        """Get list of loaded tables."""
        # Access conn to trigger lazy loading if needed
        _ = self.conn
        return list(self._tables_loaded)

    @property
    def is_available(self) -> bool:
        """Check if database has data loaded."""
        # Access conn to trigger lazy loading if needed
        _ = self.conn
        return len(self._tables_loaded) > 0

    def query(self, sql: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Execute SQL query and return results as list of dicts.
        
        Args:
            sql: SQL query string with $param placeholders
            params: Optional dict of parameter values for parameterized queries
            
        Returns:
            List of row dictionaries (with JSON-serializable types)
        """
        try:
            if params:
                result = self.conn.execute(sql, params).fetchdf()
            else:
                result = self.conn.execute(sql).fetchdf()
            records = result.to_dict("records")
            # Convert numpy types to native Python types for JSON serialization
            return [self._convert_numpy_types(record) for record in records]
        except Exception as e:
            logger.error(f"Query failed: {e}\nSQL: {sql[:200]}...")
            raise
    
    @staticmethod
    def sanitize_string(value: str) -> str:
        """
        Sanitize a string value to prevent SQL injection.
        Use parameterized queries when possible - this is a fallback.
        """
        if not isinstance(value, str):
            return str(value)
        # Remove or escape dangerous characters
        # DuckDB uses single quotes for strings
        return value.replace("'", "''").replace("\\", "\\\\").replace(";", "")
    
    @staticmethod
    def sanitize_identifier(value: str) -> str:
        """
        Sanitize an identifier (column/table name).
        Only allow alphanumeric and underscore.
        """
        import re
        if not isinstance(value, str):
            return ""
        # Only allow alphanumeric and underscore
        return re.sub(r'[^a-zA-Z0-9_]', '', value)
    
    def _convert_numpy_types(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Convert numpy types in a record to native Python types."""
        import numpy as np
        converted = {}
        for key, value in record.items():
            if isinstance(value, np.ndarray):
                converted[key] = value.tolist()
            elif isinstance(value, (np.int64, np.int32)):
                converted[key] = int(value)
            elif isinstance(value, (np.float64, np.float32)):
                converted[key] = float(value) if not np.isnan(value) else None
            elif isinstance(value, np.bool_):
                converted[key] = bool(value)
            elif pd.isna(value):
                converted[key] = None
            else:
                converted[key] = value
        return converted

    def query_df(self, sql: str) -> pd.DataFrame:
        """
        Execute SQL query and return results as DataFrame.
        
        Args:
            sql: SQL query string
            
        Returns:
            pandas DataFrame
        """
        try:
            return self.conn.execute(sql).fetchdf()
        except Exception as e:
            logger.error(f"Query failed: {e}\nSQL: {sql[:200]}...")
            raise

    def close(self):
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
            self._tables_loaded.clear()

    def reload(self):
        """Reload all data from disk."""
        self.close()
        _ = self.conn  # Triggers reload


# =============================================================================
# Singleton instance
# =============================================================================

_db_instance: Optional[LearnerDatabase] = None


def get_database() -> LearnerDatabase:
    """Get singleton database instance."""
    global _db_instance
    if _db_instance is None:
        _db_instance = LearnerDatabase()
    return _db_instance


# =============================================================================
# Pre-built Query Functions
# =============================================================================


class LearnerQueries:
    """Pre-built queries for common learner operations."""

    @staticmethod
    def _get_segment_condition(segment: str) -> str:
        """Get SQL condition for insight segments."""
        segment_conditions = {
            "at-risk": """(
                (COALESCE(total_exams, 0) - COALESCE(exams_passed, 0) >= 2) OR 
                (COALESCE(total_exams, 0) >= 2 AND COALESCE(exams_passed, 0) = 0) OR
                (data_quality_level = 'low' AND COALESCE(total_exams, 0) > 0)
            )""",
            "rising-stars": """(
                COALESCE(exams_passed, 0) >= 2 OR 
                learner_status IN ('Multi-Certified', 'Specialist', 'Champion')
            )""",
            "ready-to-advance": """(
                (COALESCE(exams_passed, 0) = 1 AND (COALESCE(uses_copilot, false) = true OR COALESCE(uses_actions, false) = true)) OR
                (learner_status = 'Certified' AND COALESCE(copilot_days, 0) > 30) OR
                (learner_status IN ('Learning', 'Engaged') AND COALESCE(copilot_days, 0) > 60)
            )""",
            "inactive": """(
                last_activity IS NULL OR
                TRY_CAST(last_activity AS DATE) < CURRENT_DATE - INTERVAL '90 days'
            )""",
            "high-value": """(
                learner_status IN ('Champion', 'Specialist', 'Partner Certified') AND
                (COALESCE(uses_copilot, false) = true OR COALESCE(uses_actions, false) = true)
            )""",
        }
        return segment_conditions.get(segment, "1=1")

    @staticmethod
    def get_total_count(
        search: Optional[str] = None,
        status: Optional[str] = None,
        segment: Optional[str] = None,
        company: Optional[str] = None,
        country: Optional[str] = None,
        region: Optional[str] = None,
        uses_copilot: Optional[bool] = None,
        is_certified: Optional[bool] = None,
    ) -> int:
        """Get total count of learners matching filters."""
        db = get_database()
        
        conditions = ["1=1"]
        
        if search:
            safe_search = db.sanitize_string(search)
            conditions.append(f"(email ILIKE '%{safe_search}%' OR userhandle ILIKE '%{safe_search}%')")
        if status:
            safe_status = db.sanitize_string(status)
            conditions.append(f"learner_status = '{safe_status}'")
        if segment:
            conditions.append(LearnerQueries._get_segment_condition(segment))
        if company:
            safe_company = db.sanitize_string(company)
            conditions.append(f"company_name ILIKE '%{safe_company}%'")
        if country:
            safe_country = db.sanitize_string(country)
            conditions.append(f"country = '{safe_country}'")
        if region:
            safe_region = db.sanitize_string(region)
            conditions.append(f"region = '{safe_region}'")
        if uses_copilot is not None:
            conditions.append(f"uses_copilot = {bool(uses_copilot)}")
        if is_certified is not None:
            if is_certified:
                conditions.append("exams_passed > 0")
            else:
                conditions.append("exams_passed = 0")

        where_clause = " AND ".join(conditions)
        
        result = db.query(f"SELECT COUNT(*) as cnt FROM learners_enriched WHERE {where_clause}")
        return result[0]["cnt"] if result else 0

    @staticmethod
    def get_learners(
        search: Optional[str] = None,
        status: Optional[str] = None,
        segment: Optional[str] = None,
        company: Optional[str] = None,
        country: Optional[str] = None,
        region: Optional[str] = None,
        uses_copilot: Optional[bool] = None,
        is_certified: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict]:
        """
        Get learners with optional filters.
        
        Uses sanitized inputs to prevent SQL injection.
        
        Args:
            search: Search term for email/userhandle
            status: Filter by learner_status
            company: Filter by company_name (partial match)
            country: Filter by country code
            region: Filter by region (AMER, EMEA, APAC)
            uses_copilot: Filter by Copilot usage
            is_certified: Filter by certification status
            limit: Max rows to return
            offset: Offset for pagination
            
        Returns:
            List of learner dictionaries
        """
        db = get_database()
        
        conditions = ["1=1"]
        
        # Sanitize all string inputs to prevent SQL injection
        if search:
            safe_search = db.sanitize_string(search)
            conditions.append(f"(email ILIKE '%{safe_search}%' OR userhandle ILIKE '%{safe_search}%')")
        if status:
            safe_status = db.sanitize_string(status)
            conditions.append(f"learner_status = '{safe_status}'")
        if segment:
            conditions.append(LearnerQueries._get_segment_condition(segment))
        if company:
            safe_company = db.sanitize_string(company)
            conditions.append(f"company_name ILIKE '%{safe_company}%'")
        if country:
            safe_country = db.sanitize_string(country)
            conditions.append(f"country = '{safe_country}'")
        if region:
            safe_region = db.sanitize_string(region)
            conditions.append(f"region = '{safe_region}'")
        if uses_copilot is not None:
            conditions.append(f"uses_copilot = {bool(uses_copilot)}")
        if is_certified is not None:
            if is_certified:
                conditions.append("exams_passed > 0")
            else:
                conditions.append("exams_passed = 0")

        where_clause = " AND ".join(conditions)
        
        # Sanitize numeric inputs
        safe_limit = max(1, min(int(limit), 1000))  # Cap at 1000
        safe_offset = max(0, int(offset))
        
        # Use random sampling if no filters applied, otherwise sort by activity
        if len(conditions) == 1:  # Only "1=1" condition
            sql = f"""
                SELECT *
                FROM learners_enriched
                WHERE {where_clause}
                ORDER BY random()
                LIMIT {safe_limit}
                OFFSET {safe_offset}
            """
        else:
            sql = f"""
                SELECT *
                FROM learners_enriched
                WHERE {where_clause}
                ORDER BY exams_passed DESC, total_exams DESC
                LIMIT {safe_limit}
                OFFSET {safe_offset}
            """
        
        return db.query(sql)

    @staticmethod
    def get_learner_by_email(email: str) -> Optional[Dict]:
        """Get a single learner by email (sanitized)."""
        db = get_database()
        safe_email = db.sanitize_string(email.lower())
        results = db.query(f"""
            SELECT * FROM learners_enriched
            WHERE email = '{safe_email}'
            LIMIT 1
        """)
        return results[0] if results else None

    @staticmethod
    def get_learner_by_dotcom_id(dotcom_id: int) -> Optional[Dict]:
        """Get a single learner by dotcom_id (type-safe)."""
        db = get_database()
        # Ensure dotcom_id is an integer
        safe_id = int(dotcom_id)
        results = db.query(f"""
            SELECT * FROM learners_enriched
            WHERE dotcom_id = {safe_id}
            LIMIT 1
        """)
        return results[0] if results else None

    @staticmethod
    def get_stats() -> Dict[str, Any]:
        """Get aggregate statistics for dashboard."""
        db = get_database()
        
        stats = db.query("""
            SELECT
                COUNT(*) as total_learners,
                SUM(CASE WHEN exams_passed > 0 THEN 1 ELSE 0 END) as certified_learners,
                SUM(exams_passed) as total_certifications,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                SUM(CASE WHEN uses_actions THEN 1 ELSE 0 END) as actions_users,
                SUM(CASE WHEN uses_security THEN 1 ELSE 0 END) as security_users,
                SUM(total_arr_in_dollars) as total_arr,
                COUNT(DISTINCT company_name) as unique_companies,
                SUM(CASE WHEN 
                    (company_name IS NOT NULL AND company_name != '') OR
                    (exam_company IS NOT NULL AND exam_company != '') OR
                    (partner_companies IS NOT NULL AND len(partner_companies) > 0)
                THEN 1 ELSE 0 END) as learners_with_company,
                COUNT(DISTINCT country) as unique_countries
            FROM learners_enriched
        """)[0]
        
        return stats

    @staticmethod
    def get_growth_metrics() -> Dict[str, Any]:
        """Get growth and activity metrics for journey dashboard."""
        db = get_database()
        
        stats = db.query("""
            SELECT
                COUNT(*) as total_learners,
                SUM(CASE WHEN total_active_days >= 1 THEN 1 ELSE 0 END) as active_any,
                SUM(CASE WHEN total_engagement_events >= 10 THEN 1 ELSE 0 END) as engaged,
                SUM(CASE WHEN total_engagement_events >= 100 THEN 1 ELSE 0 END) as highly_engaged,
                SUM(CASE WHEN uses_copilot OR uses_actions OR uses_security THEN 1 ELSE 0 END) as product_users,
                SUM(CASE WHEN exams_passed > 0 THEN 1 ELSE 0 END) as with_certifications
            FROM learners_enriched
        """)[0]
        
        total = stats.get("total_learners", 1) or 1
        
        return {
            "total_learners": stats.get("total_learners", 0),
            "active_learners": stats.get("active_any", 0),
            "active_percentage": round((stats.get("active_any", 0) / total) * 100, 1),
            "engaged_learners": stats.get("engaged", 0),
            "engaged_percentage": round((stats.get("engaged", 0) / total) * 100, 1),
            "highly_engaged": stats.get("highly_engaged", 0),
            "highly_engaged_percentage": round((stats.get("highly_engaged", 0) / total) * 100, 1),
            "product_users": stats.get("product_users", 0),
            "product_percentage": round((stats.get("product_users", 0) / total) * 100, 1),
            "with_certifications": stats.get("with_certifications", 0),
            "cert_percentage": round((stats.get("with_certifications", 0) / total) * 100, 1),
        }

    @staticmethod
    def get_stats_by_region() -> List[Dict]:
        """Get stats grouped by region."""
        db = get_database()
        return db.query("""
            SELECT
                region,
                COUNT(*) as learner_count,
                SUM(CASE WHEN exams_passed > 0 THEN 1 ELSE 0 END) as certified_count,
                SUM(exams_passed) as total_certs,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                ROUND(AVG(total_arr_in_dollars), 2) as avg_arr
            FROM learners_enriched
            GROUP BY region
            ORDER BY learner_count DESC
        """)

    @staticmethod
    def get_stats_by_status() -> List[Dict]:
        """Get stats grouped by learner status."""
        db = get_database()
        return db.query("""
            SELECT
                learner_status,
                COUNT(*) as count,
                ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
            FROM learners_enriched
            GROUP BY learner_status
            ORDER BY count DESC
        """)

    @staticmethod
    def get_journey_breakdown() -> List[Dict]:
        """Get journey status breakdown based on learning + product adoption + engagement.
        
        This provides a holistic view of learner progress combining:
        - Learning touchpoints (exams passed)
        - Product adoption (Copilot, Actions, Security)
        - Engagement levels (activity events)
        """
        db = get_database()
        return db.query("""
            SELECT 
                CASE 
                    -- Mastery: 3+ certs + 2+ products + high engagement
                    WHEN exams_passed >= 3 
                        AND (CAST(uses_copilot AS INT) + CAST(uses_actions AS INT) + CAST(uses_security AS INT)) >= 2 
                        AND total_engagement_events >= 100 
                    THEN 'Mastery'
                    -- Power User: Certified + active product user with good engagement
                    WHEN exams_passed >= 1 
                        AND (uses_copilot OR uses_actions) 
                        AND total_engagement_events >= 50 
                    THEN 'Power User'
                    -- Practitioner: Certified or actively using products with engagement
                    WHEN exams_passed >= 1 
                        OR (uses_copilot AND total_engagement_events >= 30) 
                    THEN 'Practitioner'
                    -- Active Learner: Engaged with learning but not yet certified
                    WHEN total_engagement_events >= 10 
                        OR uses_copilot 
                        OR uses_actions 
                    THEN 'Active Learner'
                    -- Explorer: Registered/minimal engagement
                    ELSE 'Explorer'
                END as journey_status,
                COUNT(*) as count,
                ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
            FROM learners_enriched
            GROUP BY 1
            ORDER BY 
                CASE journey_status
                    WHEN 'Mastery' THEN 1
                    WHEN 'Power User' THEN 2
                    WHEN 'Practitioner' THEN 3
                    WHEN 'Active Learner' THEN 4
                    WHEN 'Explorer' THEN 5
                END
        """)

    @staticmethod
    def get_top_companies(limit: int = 20) -> List[Dict]:
        """Get top companies by learner count (sanitized limit)."""
        db = get_database()
        # Ensure limit is a safe integer
        safe_limit = max(1, min(int(limit), 100))
        return db.query(f"""
            SELECT
                company_name,
                company_source,
                COUNT(*) as learner_count,
                SUM(CASE WHEN exams_passed > 0 THEN 1 ELSE 0 END) as certified_count,
                SUM(exams_passed) as total_certs,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                SUM(total_arr_in_dollars) as total_arr,
                STRING_AGG(DISTINCT region, ', ') as regions
            FROM learners_enriched
            WHERE company_name != ''
            GROUP BY company_name, company_source
            ORDER BY learner_count DESC
            LIMIT {safe_limit}
        """)

    @staticmethod
    def get_copilot_adoption_by_cert_status() -> List[Dict]:
        """Compare Copilot adoption between certified and non-certified learners."""
        db = get_database()
        return db.query("""
            SELECT
                CASE WHEN exams_passed > 0 THEN 'Certified' ELSE 'Not Certified' END as cert_status,
                COUNT(*) as total,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as uses_copilot,
                ROUND(100.0 * SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) / COUNT(*), 2) as copilot_adoption_pct,
                ROUND(AVG(copilot_days), 2) as avg_copilot_days,
                ROUND(AVG(total_engagement_events), 2) as avg_engagement
            FROM learners_enriched
            GROUP BY cert_status
            ORDER BY cert_status
        """)

    @staticmethod
    def search_learners(term: str, limit: int = 50) -> List[Dict]:
        """Full-text search across multiple fields (sanitized)."""
        db = get_database()
        # Sanitize search term and limit
        safe_term = db.sanitize_string(term)
        safe_limit = max(1, min(int(limit), 200))
        return db.query(f"""
            SELECT 
                email, userhandle, first_name, last_name,
                company_name, country, region,
                learner_status, exams_passed, uses_copilot
            FROM learners_enriched
            WHERE 
                email ILIKE '%{safe_term}%'
                OR userhandle ILIKE '%{safe_term}%'
                OR first_name ILIKE '%{safe_term}%'
                OR last_name ILIKE '%{safe_term}%'
                OR company_name ILIKE '%{safe_term}%'
            ORDER BY exams_passed DESC
            LIMIT {safe_limit}
        """)

    @staticmethod
    def get_learning_to_usage_correlation() -> Dict:
        """Analyze correlation between learning and product usage."""
        db = get_database()
        return db.query("""
            SELECT
                learner_status,
                COUNT(*) as count,
                ROUND(AVG(CASE WHEN uses_copilot THEN 1 ELSE 0 END) * 100, 1) as copilot_pct,
                ROUND(AVG(CASE WHEN uses_actions THEN 1 ELSE 0 END) * 100, 1) as actions_pct,
                ROUND(AVG(CASE WHEN uses_security THEN 1 ELSE 0 END) * 100, 1) as security_pct,
                ROUND(AVG(copilot_days), 1) as avg_copilot_days,
                ROUND(AVG(total_active_days), 1) as avg_active_days,
                ROUND(AVG(total_engagement_events), 0) as avg_engagement
            FROM learners_enriched
            GROUP BY learner_status
            ORDER BY 
                CASE learner_status
                    WHEN 'Champion' THEN 1
                    WHEN 'Specialist' THEN 2
                    WHEN 'Multi-Certified' THEN 3
                    WHEN 'Certified' THEN 4
                    WHEN 'Learning' THEN 5
                    WHEN 'Engaged' THEN 6
                    WHEN 'Registered' THEN 7
                    ELSE 8
                END
        """)


class CopilotInsightQueries:
    """Pre-built queries for Copilot insights from enriched learner data."""

    @staticmethod
    def get_copilot_stats() -> Dict[str, Any]:
        """Get Copilot adoption statistics for enrolled learners."""
        db = get_database()
        result = db.query("""
            SELECT
                COUNT(*) as total_learners,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                ROUND(100.0 * SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) / COUNT(*), 1) as adoption_rate,
                SUM(copilot_engagement_events) as total_events,
                SUM(copilot_contribution_events) as total_contributions,
                SUM(copilot_days) as total_copilot_days,
                ROUND(AVG(CASE WHEN uses_copilot THEN copilot_days ELSE NULL END), 1) as avg_days_per_user,
                ROUND(AVG(CASE WHEN uses_copilot THEN copilot_engagement_events ELSE NULL END), 0) as avg_events_per_user
            FROM learners_enriched
        """)
        return result[0] if result else {}

    @staticmethod
    def get_copilot_by_learner_status() -> List[Dict]:
        """Get Copilot usage broken down by learner status."""
        db = get_database()
        return db.query("""
            SELECT
                learner_status,
                COUNT(*) as total_learners,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                ROUND(100.0 * SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) / COUNT(*), 1) as adoption_rate,
                SUM(copilot_engagement_events) as total_events,
                ROUND(AVG(CASE WHEN uses_copilot THEN copilot_engagement_events ELSE NULL END), 0) as avg_events,
                ROUND(AVG(CASE WHEN uses_copilot THEN copilot_days ELSE NULL END), 1) as avg_days
            FROM learners_enriched
            GROUP BY learner_status
            ORDER BY copilot_users DESC
        """)

    @staticmethod
    def get_copilot_by_region() -> List[Dict]:
        """Get Copilot usage broken down by region."""
        db = get_database()
        return db.query("""
            SELECT
                region,
                COUNT(*) as total_learners,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                ROUND(100.0 * SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) / COUNT(*), 1) as adoption_rate,
                SUM(copilot_engagement_events) as total_events,
                ROUND(AVG(CASE WHEN uses_copilot THEN copilot_engagement_events ELSE NULL END), 0) as avg_events
            FROM learners_enriched
            WHERE region IS NOT NULL
            GROUP BY region
            ORDER BY copilot_users DESC
        """)

    @staticmethod
    def get_copilot_top_users(limit: int = 20) -> List[Dict]:
        """Get top Copilot users by engagement."""
        db = get_database()
        return db.query(f"""
            SELECT
                userhandle,
                email,
                company_name,
                learner_status,
                copilot_days,
                copilot_engagement_events,
                copilot_contribution_events,
                exams_passed
            FROM learners_enriched
            WHERE uses_copilot = true
            ORDER BY copilot_engagement_events DESC
            LIMIT {int(limit)}
        """)

    @staticmethod
    def get_copilot_vs_certification() -> List[Dict]:
        """Compare Copilot adoption between certified and non-certified learners."""
        db = get_database()
        return db.query("""
            SELECT
                CASE WHEN exams_passed > 0 THEN 'Certified' ELSE 'Not Certified' END as cert_status,
                COUNT(*) as total_learners,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                ROUND(100.0 * SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) / COUNT(*), 1) as adoption_rate,
                ROUND(AVG(CASE WHEN uses_copilot THEN copilot_engagement_events ELSE NULL END), 0) as avg_events,
                ROUND(AVG(CASE WHEN uses_copilot THEN copilot_days ELSE NULL END), 1) as avg_days
            FROM learners_enriched
            GROUP BY CASE WHEN exams_passed > 0 THEN 'Certified' ELSE 'Not Certified' END
            ORDER BY adoption_rate DESC
        """)
