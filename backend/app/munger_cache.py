"""
Munger Cache - Read-only DuckDB Cache Layer

Implements the Munger pattern from GitHub's data architecture:
https://github.com/github/data/blob/master/docs/adrs/munger.md

The Munger pattern uses DuckDB as a fast, read-only cache for analytical queries.
This provides:
- Sub-millisecond query response times for dashboards
- No need for a separate database server
- Automatic refresh from parquet files

Usage:
    from app.munger_cache import LearnerCache
    
    cache = LearnerCache()
    
    # Fast queries
    total = cache.count_learners()
    by_company = cache.learners_by_company(limit=20)
    certified = cache.certified_learners(company="Microsoft")

Architecture:
    Parquet Files → DuckDB (in-memory) → API Endpoints → Frontend
    
    The cache is refreshed when parquet files are updated.
    All queries are read-only for safety.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

import duckdb
import pandas as pd

# Configuration
DATA_DIR = Path(__file__).parent.parent.parent / "data"
LEARNERS_FILE = DATA_DIR / "learners_enriched.parquet"
SYNC_STATUS_FILE = DATA_DIR / "sync_status.json"
QUALITY_REPORT_FILE = DATA_DIR / "quality_report.json"

# Cache refresh interval (seconds)
CACHE_REFRESH_INTERVAL = 300  # 5 minutes


class LearnerCache:
    """
    Read-only in-memory DuckDB cache for learner data.
    
    Implements the Munger pattern for fast analytical queries.
    Thread-safe with automatic refresh when source files change.
    """
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        """Singleton pattern - only one cache instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the cache if not already done."""
        if self._initialized:
            return
        
        self._db: Optional[duckdb.DuckDBPyConnection] = None
        self._last_refresh: Optional[datetime] = None
        self._file_mtime: Optional[float] = None
        self._table_exists = False
        self._initialized = True
        
        # Initialize cache
        self._init_cache()
    
    def _init_cache(self):
        """Initialize DuckDB connection and load data."""
        try:
            # Create read-only in-memory database
            self._db = duckdb.connect(':memory:', read_only=False)
            
            # Enable optimizations
            self._db.execute("SET threads TO 4")
            self._db.execute("SET memory_limit = '512MB'")
            
            # Load data
            self._refresh_cache()
            
        except Exception as e:
            print(f"Warning: Failed to initialize Munger cache: {e}")
            self._db = None
    
    def _should_refresh(self) -> bool:
        """Check if cache needs refresh."""
        if not self._table_exists:
            return True
        
        if self._last_refresh is None:
            return True
        
        # Check time-based refresh
        if datetime.now() - self._last_refresh > timedelta(seconds=CACHE_REFRESH_INTERVAL):
            # Check if file has changed
            if LEARNERS_FILE.exists():
                current_mtime = LEARNERS_FILE.stat().st_mtime
                if self._file_mtime != current_mtime:
                    return True
        
        return False
    
    def _refresh_cache(self):
        """Reload data from parquet file."""
        if not LEARNERS_FILE.exists():
            print(f"Warning: Learner file not found: {LEARNERS_FILE}")
            return
        
        try:
            # Drop existing table
            if self._table_exists:
                self._db.execute("DROP TABLE IF EXISTS learners")
            
            # Load from parquet
            self._db.execute(f"""
                CREATE TABLE learners AS 
                SELECT * FROM read_parquet('{LEARNERS_FILE}')
            """)
            
            # Create indexes for common queries
            self._create_indexes()
            
            # Update tracking
            self._last_refresh = datetime.now()
            self._file_mtime = LEARNERS_FILE.stat().st_mtime
            self._table_exists = True
            
            # Get row count for logging
            count = self._db.execute("SELECT COUNT(*) FROM learners").fetchone()[0]
            print(f"Munger cache refreshed: {count:,} learners loaded")
            
        except Exception as e:
            print(f"Warning: Failed to refresh cache: {e}")
    
    def _create_indexes(self):
        """Create indexes for common query patterns."""
        try:
            # Index on dotcom_id (primary key)
            self._db.execute("CREATE INDEX IF NOT EXISTS idx_dotcom_id ON learners(dotcom_id)")
            
            # Index on company for company-level queries
            self._db.execute("CREATE INDEX IF NOT EXISTS idx_company ON learners(company)")
            
            # Index on region for regional queries
            self._db.execute("CREATE INDEX IF NOT EXISTS idx_region ON learners(region)")
            
            # Index on certification status
            self._db.execute("CREATE INDEX IF NOT EXISTS idx_certified ON learners(certification_count)")
            
        except Exception as e:
            # Indexes are optional, don't fail if they don't work
            print(f"Warning: Failed to create indexes: {e}")
    
    def _ensure_fresh(self):
        """Ensure cache is fresh before querying."""
        if self._should_refresh():
            self._refresh_cache()
    
    def _execute_query(self, query: str, params: tuple = None) -> pd.DataFrame:
        """Execute a query and return results as DataFrame."""
        if self._db is None:
            return pd.DataFrame()
        
        self._ensure_fresh()
        
        try:
            if params:
                return self._db.execute(query, params).fetchdf()
            return self._db.execute(query).fetchdf()
        except Exception as e:
            print(f"Query error: {e}")
            return pd.DataFrame()
    
    def _execute_scalar(self, query: str, params: tuple = None) -> Any:
        """Execute a query and return scalar result."""
        if self._db is None:
            return None
        
        self._ensure_fresh()
        
        try:
            if params:
                result = self._db.execute(query, params).fetchone()
            else:
                result = self._db.execute(query).fetchone()
            return result[0] if result else None
        except Exception as e:
            print(f"Query error: {e}")
            return None
    
    # =========================================================================
    # PUBLIC QUERY METHODS
    # =========================================================================
    
    def count_learners(self, **filters) -> int:
        """Count total learners with optional filters."""
        where_clauses = []
        params = []
        
        if "company" in filters and filters["company"]:
            where_clauses.append("company = ?")
            params.append(filters["company"])
        
        if "region" in filters and filters["region"]:
            where_clauses.append("region = ?")
            params.append(filters["region"])
        
        if "certified_only" in filters and filters["certified_only"]:
            where_clauses.append("certification_count > 0")
        
        where = " AND ".join(where_clauses) if where_clauses else "1=1"
        query = f"SELECT COUNT(*) FROM learners WHERE {where}"
        
        return self._execute_scalar(query, tuple(params) if params else None) or 0
    
    def count_certified(self, **filters) -> int:
        """Count certified learners."""
        filters["certified_only"] = True
        return self.count_learners(**filters)
    
    def learners_by_company(self, limit: int = 20, min_learners: int = 1) -> List[Dict]:
        """Get learner counts by company."""
        query = f"""
            SELECT 
                company,
                COUNT(*) as learner_count,
                SUM(CASE WHEN certification_count > 0 THEN 1 ELSE 0 END) as certified_count,
                AVG(certification_count) as avg_certifications,
                COUNT(DISTINCT region) as regions
            FROM learners
            WHERE company IS NOT NULL AND company != ''
            GROUP BY company
            HAVING COUNT(*) >= {min_learners}
            ORDER BY learner_count DESC
            LIMIT {limit}
        """
        df = self._execute_query(query)
        return df.to_dict(orient="records")
    
    def learners_by_region(self) -> List[Dict]:
        """Get learner counts by region."""
        query = """
            SELECT 
                region,
                COUNT(*) as learner_count,
                SUM(CASE WHEN certification_count > 0 THEN 1 ELSE 0 END) as certified_count,
                ROUND(AVG(certification_count), 2) as avg_certifications
            FROM learners
            WHERE region IS NOT NULL
            GROUP BY region
            ORDER BY learner_count DESC
        """
        df = self._execute_query(query)
        return df.to_dict(orient="records")
    
    def certification_breakdown(self) -> Dict[str, int]:
        """Get breakdown of certification types."""
        cert_types = [
            ("is_ghf_certified", "GitHub Foundations"),
            ("is_ghac_certified", "GitHub Actions"),
            ("is_ghcs_certified", "GitHub Copilot"),
            ("is_ghas_certified", "GitHub Advanced Security"),
            ("is_admin_certified", "GitHub Administration"),
        ]
        
        result = {}
        for col, name in cert_types:
            count = self._execute_scalar(f"SELECT SUM(CASE WHEN {col} THEN 1 ELSE 0 END) FROM learners")
            result[name] = count or 0
        
        return result
    
    def journey_stage_distribution(self) -> List[Dict]:
        """Get distribution of learners by journey stage."""
        query = """
            SELECT 
                journey_stage,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
            FROM learners
            WHERE journey_stage IS NOT NULL
            GROUP BY journey_stage
            ORDER BY count DESC
        """
        df = self._execute_query(query)
        return df.to_dict(orient="records")
    
    def product_usage_summary(self) -> Dict[str, Any]:
        """Get summary of product usage among learners."""
        query = """
            SELECT 
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_users,
                SUM(CASE WHEN uses_actions THEN 1 ELSE 0 END) as actions_users,
                SUM(CASE WHEN uses_security THEN 1 ELSE 0 END) as security_users,
                AVG(copilot_days_90d) as avg_copilot_days,
                AVG(actions_days_90d) as avg_actions_days,
                AVG(total_active_days_90d) as avg_active_days
            FROM learners
        """
        df = self._execute_query(query)
        if df.empty:
            return {}
        return df.iloc[0].to_dict()
    
    def certified_vs_uncertified_usage(self) -> Dict[str, Any]:
        """Compare product usage between certified and uncertified learners."""
        query = """
            SELECT 
                CASE WHEN certification_count > 0 THEN 'Certified' ELSE 'Uncertified' END as group_name,
                COUNT(*) as count,
                AVG(copilot_days_90d) as avg_copilot_days,
                AVG(actions_days_90d) as avg_actions_days,
                AVG(total_active_days_90d) as avg_active_days,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as copilot_adoption_pct
            FROM learners
            GROUP BY group_name
        """
        df = self._execute_query(query)
        return df.to_dict(orient="records")
    
    def top_learners(self, limit: int = 10) -> List[Dict]:
        """Get top learners by certification count."""
        query = f"""
            SELECT 
                dotcom_id,
                email,
                first_name,
                last_name,
                company,
                certification_count,
                cert_names,
                journey_stage
            FROM learners
            WHERE certification_count > 0
            ORDER BY certification_count DESC, dotcom_id
            LIMIT {limit}
        """
        df = self._execute_query(query)
        return df.to_dict(orient="records")
    
    def search_learners(self, query_str: str, limit: int = 50) -> List[Dict]:
        """Search learners by email, name, or company."""
        search = f"%{query_str}%"
        query = f"""
            SELECT 
                dotcom_id,
                email,
                first_name,
                last_name,
                company,
                certification_count,
                journey_stage
            FROM learners
            WHERE 
                email ILIKE ? OR
                first_name ILIKE ? OR
                last_name ILIKE ? OR
                company ILIKE ?
            ORDER BY certification_count DESC
            LIMIT {limit}
        """
        df = self._execute_query(query, (search, search, search, search))
        return df.to_dict(orient="records")
    
    def get_learner(self, dotcom_id: int) -> Optional[Dict]:
        """Get a single learner by dotcom_id."""
        query = "SELECT * FROM learners WHERE dotcom_id = ?"
        df = self._execute_query(query, (dotcom_id,))
        if df.empty:
            return None
        return df.iloc[0].to_dict()
    
    def company_roi_metrics(self, company: str) -> Dict[str, Any]:
        """Get ROI metrics for a specific company."""
        query = """
            SELECT 
                COUNT(*) as total_learners,
                SUM(CASE WHEN certification_count > 0 THEN 1 ELSE 0 END) as certified_learners,
                SUM(certification_count) as total_certifications,
                AVG(certification_count) as avg_certifications_per_learner,
                SUM(CASE WHEN uses_copilot THEN 1 ELSE 0 END) as copilot_adopters,
                SUM(CASE WHEN uses_actions THEN 1 ELSE 0 END) as actions_adopters,
                AVG(copilot_days_90d) as avg_copilot_usage,
                AVG(total_active_days_90d) as avg_github_activity
            FROM learners
            WHERE company = ?
        """
        df = self._execute_query(query, (company,))
        if df.empty:
            return {}
        
        metrics = df.iloc[0].to_dict()
        
        # Calculate ROI indicators
        if metrics.get("total_learners", 0) > 0:
            metrics["certification_rate"] = (
                metrics.get("certified_learners", 0) / metrics["total_learners"] * 100
            )
            metrics["copilot_adoption_rate"] = (
                metrics.get("copilot_adopters", 0) / metrics["total_learners"] * 100
            )
        
        return metrics
    
    def get_data_freshness(self) -> Dict[str, Any]:
        """Get information about data freshness."""
        result = {
            "cache_last_refresh": self._last_refresh.isoformat() if self._last_refresh else None,
            "file_modified": None,
            "record_count": 0,
            "sync_status": None,
            "quality_report": None,
        }
        
        if LEARNERS_FILE.exists():
            mtime = datetime.fromtimestamp(LEARNERS_FILE.stat().st_mtime)
            result["file_modified"] = mtime.isoformat()
            result["record_count"] = self.count_learners()
        
        if SYNC_STATUS_FILE.exists():
            try:
                with open(SYNC_STATUS_FILE) as f:
                    result["sync_status"] = json.load(f)
            except Exception:
                pass
        
        if QUALITY_REPORT_FILE.exists():
            try:
                with open(QUALITY_REPORT_FILE) as f:
                    quality = json.load(f)
                    result["quality_report"] = quality.get("summary")
            except Exception:
                pass
        
        return result
    
    def raw_query(self, query: str) -> pd.DataFrame:
        """
        Execute a raw SQL query (for advanced use cases).
        
        Security Note: Only use for internal/admin queries.
        Do not expose to external users.
        """
        return self._execute_query(query)


# Singleton instance for import
learner_cache = LearnerCache()
