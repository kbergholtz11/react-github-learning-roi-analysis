"""Tests for logging middleware."""

import json
import logging
import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.logging import (
    LoggingMiddleware,
    get_correlation_id,
    set_correlation_id,
    CorrelationIdFilter,
    JSONFormatter,
    HumanReadableFormatter,
    setup_logging,
    ErrorTracker,
)


class TestCorrelationId:
    """Tests for correlation ID management."""

    def test_set_and_get_correlation_id(self):
        """Should be able to set and get correlation ID."""
        set_correlation_id("test-123")
        assert get_correlation_id() == "test-123"

    def test_correlation_id_filter(self):
        """Correlation ID filter should add ID to log records."""
        set_correlation_id("filter-test-456")
        
        filter_obj = CorrelationIdFilter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="test message",
            args=(),
            exc_info=None,
        )
        
        result = filter_obj.filter(record)
        
        assert result is True
        assert record.correlation_id == "filter-test-456"


class TestFormatters:
    """Tests for log formatters."""

    def test_json_formatter_basic(self):
        """JSON formatter should produce valid JSON."""
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None,
        )
        record.correlation_id = "json-test-789"
        
        output = formatter.format(record)
        
        parsed = json.loads(output)
        assert parsed["level"] == "INFO"
        assert parsed["logger"] == "test.logger"
        assert parsed["message"] == "Test message"
        assert parsed["correlation_id"] == "json-test-789"
        assert "timestamp" in parsed

    def test_json_formatter_with_exception(self):
        """JSON formatter should include exception info."""
        formatter = JSONFormatter()
        
        try:
            raise ValueError("Test error")
        except ValueError:
            import sys
            exc_info = sys.exc_info()
        
        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="",
            lineno=0,
            msg="Error occurred",
            args=(),
            exc_info=exc_info,
        )
        record.correlation_id = "error-test"
        
        output = formatter.format(record)
        parsed = json.loads(output)
        
        assert "exception" in parsed
        assert parsed["exception"]["type"] == "ValueError"
        assert "Test error" in parsed["exception"]["message"]

    def test_human_readable_formatter(self):
        """Human readable formatter should produce readable output."""
        formatter = HumanReadableFormatter()
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Human readable test",
            args=(),
            exc_info=None,
        )
        record.correlation_id = "human-test-abc"
        
        output = formatter.format(record)
        
        assert "INFO" in output
        assert "human-te" in output  # First 8 chars of correlation ID
        assert "Human readable test" in output


class TestLoggingMiddleware:
    """Tests for logging middleware."""

    @pytest.fixture
    def app_with_logging(self):
        """Create test app with logging middleware."""
        app = FastAPI()
        app.add_middleware(LoggingMiddleware, exclude_paths=["/health"])

        @app.get("/test")
        async def test_endpoint():
            return {"message": "ok"}

        @app.get("/health")
        async def health_endpoint():
            return {"status": "healthy"}

        @app.get("/error")
        async def error_endpoint():
            raise ValueError("Test error")

        return app

    def test_correlation_id_in_response_headers(self, app_with_logging):
        """Response should include correlation ID header."""
        client = TestClient(app_with_logging, raise_server_exceptions=False)
        response = client.get("/test")
        
        assert response.status_code == 200
        assert "X-Correlation-ID" in response.headers

    def test_custom_correlation_id_preserved(self, app_with_logging):
        """Custom correlation ID from request should be preserved."""
        client = TestClient(app_with_logging)
        custom_id = "my-custom-correlation-id"
        
        response = client.get("/test", headers={"X-Correlation-ID": custom_id})
        
        assert response.headers["X-Correlation-ID"] == custom_id

    def test_response_time_header(self, app_with_logging):
        """Response should include timing header."""
        client = TestClient(app_with_logging)
        response = client.get("/test")
        
        assert "X-Response-Time" in response.headers
        assert "ms" in response.headers["X-Response-Time"]


class TestErrorTracker:
    """Tests for error tracking."""

    def test_track_error(self):
        """Should track errors and return error ID."""
        tracker = ErrorTracker()
        
        try:
            raise RuntimeError("Test runtime error")
        except RuntimeError as e:
            error_id = tracker.track(e, context={"test": "context"})
        
        assert error_id is not None
        assert len(tracker.errors) == 1
        assert tracker.errors[0]["type"] == "RuntimeError"
        assert tracker.errors[0]["context"]["test"] == "context"

    def test_get_recent_errors(self):
        """Should return recent errors."""
        tracker = ErrorTracker()
        
        for i in range(5):
            tracker.track(ValueError(f"Error {i}"))
        
        recent = tracker.get_recent_errors(3)
        
        assert len(recent) == 3
        assert "Error 4" in recent[-1]["message"]

    def test_error_stats(self):
        """Should return error statistics."""
        tracker = ErrorTracker()
        
        tracker.track(ValueError("value error 1"))
        tracker.track(ValueError("value error 2"))
        tracker.track(RuntimeError("runtime error"))
        
        stats = tracker.get_error_stats()
        
        assert stats["total_errors"] == 3
        assert stats["error_types"]["ValueError"] == 2
        assert stats["error_types"]["RuntimeError"] == 1

    def test_max_errors_limit(self):
        """Should trim old errors when limit exceeded."""
        tracker = ErrorTracker()
        tracker.max_errors = 10  # Set low limit for testing
        
        for i in range(15):
            tracker.track(ValueError(f"Error {i}"))
        
        assert len(tracker.errors) == 10
        # Should keep most recent errors
        assert "Error 14" in tracker.errors[-1]["message"]

    def test_singleton_instance(self):
        """ErrorTracker should use singleton pattern."""
        tracker1 = ErrorTracker.get_instance()
        tracker2 = ErrorTracker.get_instance()
        
        assert tracker1 is tracker2


class TestSetupLogging:
    """Tests for logging setup."""

    def test_setup_logging_development(self):
        """Setup logging should work in development mode."""
        setup_logging(json_format=False, level="DEBUG")
        
        logger = logging.getLogger("test.setup")
        assert logger.level == logging.NOTSET  # Inherits from root

    def test_setup_logging_production(self):
        """Setup logging should work in production mode."""
        setup_logging(json_format=True, level="INFO")
        
        # Should not raise
        logger = logging.getLogger("test.production")
        logger.info("Test production log")
