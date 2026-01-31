"""
Rate limiting middleware for API protection.

Uses slowapi for request rate limiting with configurable limits per endpoint.
"""

import logging
from typing import Callable

from fastapi import Request, Response
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import get_settings

logger = logging.getLogger(__name__)


def get_rate_limit_key(request: Request) -> str:
    """
    Get rate limit key from request.
    
    Uses client IP address, with optional API key from headers.
    """
    # Check for API key in headers
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"api_key:{api_key}"
    
    # Fall back to IP address
    return get_remote_address(request)


# Create limiter instance
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["200/minute"],  # Default: 200 requests per minute
    storage_uri="memory://",  # In-memory storage (use Redis in production)
    strategy="fixed-window",
)


# Rate limit configurations for different endpoint types
RATE_LIMITS = {
    "default": "200/minute",
    "health": "60/minute",
    "query": "30/minute",  # More restrictive for heavy queries
    "copilot": "100/minute",
    "export": "10/minute",  # Very restrictive for exports
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to apply rate limiting across all routes.
    
    Features:
    - Configurable limits per endpoint pattern
    - Adds rate limit headers to responses
    - Logs rate limit violations
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""
        try:
            response = await call_next(request)
            
            # Add rate limit headers (if available)
            # These help clients understand their limits
            if hasattr(request.state, "view_rate_limit"):
                response.headers["X-RateLimit-Limit"] = str(
                    request.state.view_rate_limit.limit
                )
                response.headers["X-RateLimit-Remaining"] = str(
                    request.state.view_rate_limit.remaining
                )
                response.headers["X-RateLimit-Reset"] = str(
                    request.state.view_rate_limit.reset_after
                )
            
            return response
            
        except RateLimitExceeded as exc:
            client_id = get_rate_limit_key(request)
            logger.warning(
                f"Rate limit exceeded for {client_id} on {request.url.path}",
                extra={
                    "client_id": client_id,
                    "path": request.url.path,
                    "method": request.method,
                }
            )
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "Too many requests. Please slow down.",
                    "retry_after": getattr(exc, "retry_after", 60),
                },
                headers={
                    "Retry-After": str(getattr(exc, "retry_after", 60)),
                    "X-RateLimit-Limit": "0",
                    "X-RateLimit-Remaining": "0",
                }
            )


def get_endpoint_limit(path: str) -> str:
    """Get rate limit string for a specific endpoint path.
    
    Used for determining appropriate rate limits based on endpoint type.
    """
    if "/health" in path:
        return RATE_LIMITS["health"]
    if "/query" in path:
        return RATE_LIMITS["query"]
    if "/copilot" in path:
        return RATE_LIMITS["copilot"]
    if "/export" in path:
        return RATE_LIMITS["export"]
    return RATE_LIMITS["default"]
