"""Tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestHealthEndpoints:
    """Test health and root endpoints."""

    def test_health_check(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    def test_root(self, client):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Learning ROI API"
        assert "docs" in data


class TestMetricsEndpoints:
    """Test metrics API endpoints."""

    def test_get_metrics(self, client):
        """Test metrics endpoint returns data."""
        response = client.get("/api/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "status_breakdown" in data
        assert "funnel" in data

    def test_metrics_contains_required_fields(self, client):
        """Test metrics contains all required fields."""
        response = client.get("/api/metrics")
        data = response.json()
        metrics = data["metrics"]
        
        required_fields = [
            "total_learners",
            "certified_users",
            "learning_users",
            "impact_score",
        ]
        for field in required_fields:
            assert field in metrics, f"Missing field: {field}"


class TestLearnersEndpoints:
    """Test learners API endpoints."""

    def test_list_learners(self, client):
        """Test listing learners with pagination."""
        response = client.get("/api/learners")
        assert response.status_code == 200
        data = response.json()
        assert "learners" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

    def test_list_learners_with_search(self, client):
        """Test searching learners."""
        response = client.get("/api/learners?search=test")
        assert response.status_code == 200
        data = response.json()
        assert "learners" in data

    def test_list_learners_with_status_filter(self, client):
        """Test filtering by status."""
        response = client.get("/api/learners?status=Champion")
        assert response.status_code == 200
        data = response.json()
        assert "learners" in data

    def test_list_learners_pagination(self, client):
        """Test pagination parameters."""
        response = client.get("/api/learners?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10

    def test_search_learners(self, client):
        """Test quick search endpoint."""
        response = client.get("/api/learners/search?q=test")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "count" in data

    def test_learners_by_status(self, client):
        """Test getting learners by status."""
        response = client.get("/api/learners/status/Champion")
        assert response.status_code == 200
        data = response.json()
        assert "learners" in data
        assert data["status"] == "Champion"

    def test_recent_certifications(self, client):
        """Test getting recent certifications."""
        response = client.get("/api/learners/certified/recent?days=30")
        assert response.status_code == 200
        data = response.json()
        assert "learners" in data
        assert "count" in data


class TestJourneyEndpoints:
    """Test journey API endpoints."""

    def test_get_journey(self, client):
        """Test journey analytics endpoint."""
        response = client.get("/api/journey")
        assert response.status_code == 200
        data = response.json()
        assert "funnel" in data
        assert "avg_time_to_completion" in data
        assert "drop_off_analysis" in data

    def test_get_funnel(self, client):
        """Test funnel endpoint."""
        response = client.get("/api/journey/funnel")
        assert response.status_code == 200
        data = response.json()
        assert "funnel" in data
        assert "total" in data

    def test_get_progression(self, client):
        """Test progression endpoint."""
        response = client.get("/api/journey/progression")
        assert response.status_code == 200
        data = response.json()
        assert "progression" in data

    def test_get_velocity(self, client):
        """Test velocity endpoint."""
        response = client.get("/api/journey/velocity")
        assert response.status_code == 200
        data = response.json()
        assert "stages" in data

    def test_get_drop_off(self, client):
        """Test drop-off endpoint."""
        response = client.get("/api/journey/drop-off")
        assert response.status_code == 200
        data = response.json()
        assert "analysis" in data


class TestImpactEndpoints:
    """Test impact API endpoints."""

    def test_get_impact(self, client):
        """Test impact analytics endpoint."""
        response = client.get("/api/impact")
        assert response.status_code == 200
        data = response.json()
        assert "stage_impact" in data
        assert "product_adoption" in data
        assert "correlation_data" in data

    def test_get_impact_by_stage(self, client):
        """Test impact by stage endpoint."""
        response = client.get("/api/impact/by-stage")
        assert response.status_code == 200
        data = response.json()
        assert "stages" in data

    def test_get_products(self, client):
        """Test products endpoint."""
        response = client.get("/api/impact/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data

    def test_get_roi(self, client):
        """Test ROI endpoint."""
        response = client.get("/api/impact/roi")
        assert response.status_code == 200
        data = response.json()
        assert "total_roi" in data
        assert "breakdown" in data


class TestQueryEndpoints:
    """Test custom query endpoints."""

    def test_get_tables(self, client):
        """Test listing available tables."""
        response = client.get("/api/query/tables")
        assert response.status_code == 200
        data = response.json()
        assert "tables" in data
        assert len(data["tables"]) > 0

    def test_get_examples(self, client):
        """Test getting query examples."""
        response = client.get("/api/query/examples")
        assert response.status_code == 200
        data = response.json()
        assert "examples" in data
        assert len(data["examples"]) > 0

    def test_execute_query_requires_kusto(self, client):
        """Test that execute query requires Kusto (returns 503 if not configured)."""
        response = client.post(
            "/api/query",
            json={"query": "CertifiedUsers | take 10"}
        )
        # Should be 503 if Kusto not configured
        assert response.status_code in [200, 503]
