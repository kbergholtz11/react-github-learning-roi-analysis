"""
FastAPI Backend for GitHub Learning ROI Dashboard

This is the main application entry point.
Run with: uvicorn app.main:app --reload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes import metrics, learners, journey, impact, query, copilot

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    settings = get_settings()
    logger.info("Starting Learning ROI API")
    logger.info(f"Kusto enabled: {settings.kusto_enabled}")
    logger.info(f"Data directory: {settings.data_path}")
    
    # Initialize services
    if settings.kusto_enabled:
        from app.kusto import get_kusto_service
        try:
            kusto = get_kusto_service()
            logger.info("Kusto client initialized")
        except Exception as e:
            logger.warning(f"Kusto initialization failed: {e}")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Learning ROI API")


# Create FastAPI application
app = FastAPI(
    title="Learning ROI API",
    description="""
    FastAPI backend for GitHub Learning ROI Dashboard.
    
    ## Features
    
    - **Live Kusto Queries**: Real-time data from Azure Data Explorer
    - **Complex Filtering**: Advanced learner search and filtering
    - **User-specific Data**: Individual learner profiles and activity
    - **Impact Analytics**: ROI and learning impact metrics
    
    ## Data Sources
    
    When Kusto is configured, data is fetched from Azure Data Explorer for real-time analytics.
    Falls back to CSV files when Kusto is not available.
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred"},
    )


# Health check
@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns service status and configuration info.
    """
    settings = get_settings()
    
    from app.kusto import get_kusto_service
    kusto = get_kusto_service()
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "kusto_enabled": settings.kusto_enabled,
        "kusto_connected": kusto.is_available,
        "data_path_exists": settings.data_path.exists(),
    }


# Root endpoint
@app.get("/")
async def root():
    """API root - provides basic info."""
    return {
        "name": "Learning ROI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# Register routers
app.include_router(metrics.router, prefix="/api")
app.include_router(learners.router, prefix="/api")
app.include_router(journey.router, prefix="/api")
app.include_router(impact.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(copilot.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )
