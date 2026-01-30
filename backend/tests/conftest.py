"""Pytest configuration and fixtures."""

import os
import sys

# Set environment BEFORE any imports
os.environ["KUSTO_CSE_CLUSTER_URL"] = ""
os.environ["KUSTO_GH_CLUSTER_URL"] = ""
os.environ["KUSTO_CLUSTER_URL"] = ""
os.environ["KUSTO_CSE_DATABASE"] = ""
os.environ["KUSTO_GH_DATABASE"] = ""
os.environ["KUSTO_DATABASE"] = ""

# Remove any cached modules to force reload with new env
for mod in list(sys.modules.keys()):
    if mod.startswith("app."):
        del sys.modules[mod]

import pytest
from unittest.mock import MagicMock, PropertyMock


@pytest.fixture(scope="session", autouse=True)
def disable_kusto():
    """Disable Kusto completely for tests."""
    from app import kusto as kusto_module
    from app.config import get_settings
    
    # Clear settings cache
    get_settings.cache_clear()
    
    # Create a mock service that says Kusto is not available
    mock_service = MagicMock()
    mock_service.is_available = False
    mock_service.available_clusters = []
    
    # Replace the singleton
    kusto_module._kusto_service = mock_service
    
    # Also patch get_kusto_service to always return our mock
    original_get = kusto_module.get_kusto_service
    kusto_module.get_kusto_service = lambda: mock_service
    
    yield
    
    # Restore
    kusto_module.get_kusto_service = original_get
