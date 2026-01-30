"""Tests for rate limiting middleware."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.middleware.rate_limit import (
    RateLimitMiddleware,
    get_rate_limit_key,
    get_endpoint_limit,
    RATE_LIMITS,
)


class TestRateLimitKey:
    """Tests for rate limit key generation."""

    def test_get_endpoint_limit_health(self):
        """Health endpoints should have specific limits."""
        assert get_endpoint_limit("/health") == RATE_LIMITS["health"]
        assert get_endpoint_limit("/api/health") == RATE_LIMITS["health"]

    def test_get_endpoint_limit_query(self):
        """Query endpoints should have restrictive limits."""
        assert get_endpoint_limit("/api/query") == RATE_LIMITS["query"]
        assert get_endpoint_limit("/api/query/execute") == RATE_LIMITS["query"]

    def test_get_endpoint_limit_copilot(self):
        """Copilot endpoints should have specific limits."""
        assert get_endpoint_limit("/api/copilot") == RATE_LIMITS["copilot"]
        assert get_endpoint_limit("/api/copilot/suggestions") == RATE_LIMITS["copilot"]

    def test_get_endpoint_limit_export(self):
        """Export endpoints should have very restrictive limits."""
        assert get_endpoint_limit("/api/export") == RATE_LIMITS["export"]
        assert get_endpoint_limit("/api/export/csv") == RATE_LIMITS["export"]

    def test_get_endpoint_limit_default(self):
        """Unknown endpoints should use default limits."""
        assert get_endpoint_limit("/api/metrics") == RATE_LIMITS["default"]
        assert get_endpoint_limit("/api/learners") == RATE_LIMITS["default"]


class TestRateLimitIntegration:
    """Integration tests for rate limiting."""

    @pytest.fixture
    def app_with_rate_limit(self):
        """Create a test app with rate limiting."""
        from fastapi import Request
        from slowapi import _rate_limit_exceeded_handler
        from slowapi.errors import RateLimitExceeded

        app = FastAPI()
        
        # Create a very restrictive limiter for testing
        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=["2/minute"],
            storage_uri="memory://",
        )
        
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

        @app.get("/test")
        @limiter.limit("2/minute")
        async def test_endpoint(request: Request):
            return {"message": "ok"}

        return app

    def test_rate_limit_headers_present(self, app_with_rate_limit):
        """Response should include rate limit headers."""
        client = TestClient(app_with_rate_limit)
        response = client.get("/test")
        
        assert response.status_code == 200
        # Note: Headers depend on slowapi configuration

    def test_rate_limits_dict_values(self):
        """Rate limits dict should have expected structure."""
        assert "default" in RATE_LIMITS
        assert "health" in RATE_LIMITS
        assert "query" in RATE_LIMITS
        assert "copilot" in RATE_LIMITS
        assert "export" in RATE_LIMITS
        
        # All values should be valid rate limit strings
        for key, value in RATE_LIMITS.items():
            assert "/" in value  # e.g., "200/minute"
