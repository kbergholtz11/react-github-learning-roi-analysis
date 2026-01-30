"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


# Cluster aliases for easier access
CLUSTER_CSE = "cse"
CLUSTER_GH = "gh"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Kusto Configuration - Multiple Clusters
    # CSE Analytics cluster (default)
    kusto_cse_cluster_url: str = "https://cse-analytics.centralus.kusto.windows.net"
    kusto_cse_database: str = "ACE"
    
    # GH Analytics cluster - supports multiple databases
    kusto_gh_cluster_url: str = "https://gh-analytics.eastus.kusto.windows.net"
    kusto_gh_database: str = "ace"  # Default database
    kusto_gh_databases: str = "ace,copilot,hydro,snapshots"  # All available databases
    
    # Legacy single-cluster config (for backwards compatibility)
    kusto_cluster_url: str = ""
    kusto_database: str = ""

    # Azure Authentication (optional - uses DefaultAzureCredential)
    azure_tenant_id: Optional[str] = None
    azure_client_id: Optional[str] = None
    azure_client_secret: Optional[str] = None

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Cache
    cache_ttl: int = 300  # 5 minutes

    # Data directory for CSV fallback
    data_dir: str = "../data"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def data_path(self) -> Path:
        """Get absolute path to data directory."""
        return Path(self.data_dir).resolve()

    @property
    def kusto_enabled(self) -> bool:
        """Check if any Kusto cluster is configured."""
        return bool(
            (self.kusto_cluster_url and self.kusto_database) or
            (self.kusto_cse_cluster_url and self.kusto_cse_database) or
            (self.kusto_gh_cluster_url and self.kusto_gh_database)
        )

    @property
    def clusters(self) -> Dict[str, Dict[str, str]]:
        """Get all configured clusters as a dict."""
        clusters = {}
        
        # CSE cluster
        if self.kusto_cse_cluster_url and self.kusto_cse_database:
            clusters[CLUSTER_CSE] = {
                "url": self.kusto_cse_cluster_url,
                "database": self.kusto_cse_database,
            }
        
        # GH cluster
        if self.kusto_gh_cluster_url and self.kusto_gh_database:
            clusters[CLUSTER_GH] = {
                "url": self.kusto_gh_cluster_url,
                "database": self.kusto_gh_database,
            }
        
        # Legacy single cluster (use as 'default')
        if self.kusto_cluster_url and self.kusto_database:
            clusters["default"] = {
                "url": self.kusto_cluster_url,
                "database": self.kusto_database,
            }
        
        return clusters

    @property
    def default_cluster(self) -> Optional[str]:
        """Get the default cluster name."""
        if CLUSTER_CSE in self.clusters:
            return CLUSTER_CSE
        if "default" in self.clusters:
            return "default"
        if self.clusters:
            return next(iter(self.clusters.keys()))
        return None

    @property
    def gh_databases_list(self) -> List[str]:
        """Get list of available GH databases."""
        if self.kusto_gh_databases:
            return [db.strip() for db in self.kusto_gh_databases.split(",")]
        return [self.kusto_gh_database] if self.kusto_gh_database else []


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
