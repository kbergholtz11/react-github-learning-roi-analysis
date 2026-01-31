"""
DuckDB Database Service for Fast Learner Queries

Provides blazing-fast in-memory queries over Parquet files using DuckDB.
Query latency: <20ms for most operations.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

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

    def query(self, sql: str) -> List[Dict[str, Any]]:
        """
        Execute SQL query and return results as list of dicts.
        
        Args:
            sql: SQL query string
            
        Returns:
            List of row dictionaries (with JSON-serializable types)
        """
        try:
            result = self.conn.execute(sql).fetchdf()
            records = result.to_dict("records")
            # Convert numpy types to native Python types for JSON serialization
            return [self._convert_numpy_types(record) for record in records]
        except Exception as e:
            logger.error(f"Query failed: {e}\nSQL: {sql[:200]}...")
            raise
    
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
    def get_learners(
        search: Optional[str] = None,
        status: Optional[str] = None,
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
        
        if search:
            conditions.append(f"(email ILIKE '%{search}%' OR userhandle ILIKE '%{search}%')")
        if status:
            conditions.append(f"learner_status = '{status}'")
        if company:
            conditions.append(f"company_name ILIKE '%{company}%'")
        if country:
            conditions.append(f"country = '{country}'")
        if region:
            conditions.append(f"region = '{region}'")
        if uses_copilot is not None:
            conditions.append(f"uses_copilot = {uses_copilot}")
        if is_certified is not None:
            if is_certified:
                conditions.append("exams_passed > 0")
            else:
                conditions.append("exams_passed = 0")

        where_clause = " AND ".join(conditions)
        
        sql = f"""
            SELECT *
            FROM learners_enriched
            WHERE {where_clause}
            ORDER BY exams_passed DESC, total_exams DESC
            LIMIT {limit}
            OFFSET {offset}
        """
        
        return db.query(sql)

    @staticmethod
    def get_learner_by_email(email: str) -> Optional[Dict]:
        """Get a single learner by email."""
        db = get_database()
        results = db.query(f"""
            SELECT * FROM learners_enriched
            WHERE email = '{email.lower()}'
            LIMIT 1
        """)
        return results[0] if results else None

    @staticmethod
    def get_learner_by_dotcom_id(dotcom_id: int) -> Optional[Dict]:
        """Get a single learner by dotcom_id."""
        db = get_database()
        results = db.query(f"""
            SELECT * FROM learners_enriched
            WHERE dotcom_id = {dotcom_id}
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
                COUNT(DISTINCT country) as unique_countries
            FROM learners_enriched
            WHERE company_name != '' OR dotcom_id > 0
        """)[0]
        
        return stats

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
    def get_top_companies(limit: int = 20) -> List[Dict]:
        """Get top companies by learner count."""
        db = get_database()
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
            LIMIT {limit}
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
        """Full-text search across multiple fields."""
        db = get_database()
        return db.query(f"""
            SELECT 
                email, userhandle, first_name, last_name,
                company_name, country, region,
                learner_status, exams_passed, uses_copilot
            FROM learners_enriched
            WHERE 
                email ILIKE '%{term}%'
                OR userhandle ILIKE '%{term}%'
                OR first_name ILIKE '%{term}%'
                OR last_name ILIKE '%{term}%'
                OR company_name ILIKE '%{term}%'
            ORDER BY exams_passed DESC
            LIMIT {limit}
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
