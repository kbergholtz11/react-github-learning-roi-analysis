"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Kusto Configuration
    kusto_cluster_url: str = ""
    kusto_database: str = ""

    # Azure Authentication (optional - uses DefaultAzureCredential)
    azure_tenant_id: str | None = None
    azure_client_id: str | None = None
    azure_client_secret: str | None = None

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
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def data_path(self) -> Path:
        """Get absolute path to data directory."""
        return Path(self.data_dir).resolve()

    @property
    def kusto_enabled(self) -> bool:
        """Check if Kusto is configured."""
        return bool(self.kusto_cluster_url and self.kusto_database)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
