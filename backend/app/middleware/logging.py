"""
Structured logging and monitoring middleware.

Provides:
- Request/response logging with timing
- Correlation IDs for request tracing
- Error tracking and reporting
- Structured JSON logging for production
"""

import json
import logging
import sys
import time
import traceback
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

# Context variable for correlation ID (thread-safe)
_correlation_id: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID."""
    return _correlation_id.get()


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID for the current context."""
    _correlation_id.set(correlation_id)


class CorrelationIdFilter(logging.Filter):
    """Logging filter that adds correlation ID to log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = get_correlation_id() or "no-correlation-id"
        return True


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging in production."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", None),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # Add extra fields
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)

        return json.dumps(log_data)


class HumanReadableFormatter(logging.Formatter):
    """Human-readable formatter for development."""

    def format(self, record: logging.LogRecord) -> str:
        correlation_id = getattr(record, "correlation_id", "no-id")
        return (
            f"{self.formatTime(record)} | {record.levelname:8s} | "
            f"[{correlation_id[:8]}] | {record.name} | {record.getMessage()}"
        )


def setup_logging(json_format: bool = False, level: str = "INFO") -> None:
    """
    Configure application logging.

    Args:
        json_format: Use JSON format (for production)
        level: Logging level
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper()))

    # Add correlation ID filter
    console_handler.addFilter(CorrelationIdFilter())

    # Set formatter based on environment
    if json_format:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(HumanReadableFormatter())

    root_logger.addHandler(console_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("azure").setLevel(logging.WARNING)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for request/response logging and monitoring.

    Features:
    - Assigns correlation ID to each request
    - Logs request details (method, path, client IP)
    - Logs response details (status code, timing)
    - Tracks errors with full context
    """

    def __init__(self, app, exclude_paths: Optional[list] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/favicon.ico"]
        self.logger = logging.getLogger("api.requests")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with logging."""
        # Generate or extract correlation ID
        correlation_id = request.headers.get(
            "X-Correlation-ID",
            request.headers.get("X-Request-ID", str(uuid.uuid4()))
        )
        set_correlation_id(correlation_id)

        # Skip logging for excluded paths
        if any(request.url.path.startswith(p) for p in self.exclude_paths):
            response = await call_next(request)
            response.headers["X-Correlation-ID"] = correlation_id
            return response

        # Capture request details
        start_time = time.perf_counter()
        client_ip = self._get_client_ip(request)
        
        request_info = {
            "method": request.method,
            "path": request.url.path,
            "query": str(request.query_params) if request.query_params else None,
            "client_ip": client_ip,
            "user_agent": request.headers.get("User-Agent"),
        }

        self.logger.info(
            f"Request: {request.method} {request.url.path}",
            extra={"extra_fields": {"request": request_info}}
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log unhandled exceptions
            duration_ms = (time.perf_counter() - start_time) * 1000
            self._log_error(request, exc, duration_ms)
            raise

        # Calculate timing
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log response
        response_info = {
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        }

        log_level = self._get_log_level(response.status_code)
        self.logger.log(
            log_level,
            f"Response: {response.status_code} in {duration_ms:.2f}ms",
            extra={"extra_fields": {"response": response_info, "request": request_info}}
        )

        # Add headers to response
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"

    def _get_log_level(self, status_code: int) -> int:
        """Get appropriate log level based on status code."""
        if status_code >= 500:
            return logging.ERROR
        if status_code >= 400:
            return logging.WARNING
        return logging.INFO

    def _log_error(self, request: Request, exc: Exception, duration_ms: float) -> None:
        """Log error with full context."""
        error_info = {
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "traceback": traceback.format_exc(),
            "duration_ms": round(duration_ms, 2),
            "method": request.method,
            "path": request.url.path,
            "client_ip": self._get_client_ip(request),
        }
        
        self.logger.error(
            f"Unhandled error: {type(exc).__name__}: {exc}",
            exc_info=True,
            extra={"extra_fields": error_info}
        )


class ErrorTracker:
    """
    Simple error tracking for monitoring.
    
    In production, this would integrate with services like:
    - Sentry
    - Application Insights
    - Datadog
    """
    
    _instance: Optional["ErrorTracker"] = None
    
    def __init__(self):
        self.errors: list = []
        self.max_errors = 1000  # Keep last 1000 errors
        self.logger = logging.getLogger("api.errors")
    
    @classmethod
    def get_instance(cls) -> "ErrorTracker":
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def track(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Track an error.
        
        Returns error ID for reference.
        """
        error_id = str(uuid.uuid4())
        
        error_data = {
            "id": error_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "type": type(error).__name__,
            "message": str(error),
            "traceback": traceback.format_exc(),
            "correlation_id": get_correlation_id(),
            "context": context or {},
        }
        
        self.errors.append(error_data)
        
        # Trim old errors
        if len(self.errors) > self.max_errors:
            self.errors = self.errors[-self.max_errors:]
        
        self.logger.error(
            f"Tracked error [{error_id}]: {type(error).__name__}: {error}",
            extra={"extra_fields": error_data}
        )
        
        return error_id
    
    def get_recent_errors(self, count: int = 10) -> list:
        """Get recent errors."""
        return self.errors[-count:]
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics."""
        from collections import Counter
        
        error_types = Counter(e["type"] for e in self.errors)
        
        return {
            "total_errors": len(self.errors),
            "error_types": dict(error_types.most_common(10)),
            "oldest_error": self.errors[0]["timestamp"] if self.errors else None,
            "newest_error": self.errors[-1]["timestamp"] if self.errors else None,
        }
