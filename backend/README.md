# Learning ROI FastAPI Backend

High-performance Python backend for the GitHub Learning ROI Dashboard.

## Features

- 🚀 **Live Kusto Queries** - Real-time data from Azure Data Explorer
- 🔍 **Complex Filtering** - Advanced search and filter capabilities
- 👤 **User-specific Data** - Individual learner profiles
- 📊 **Impact Analytics** - ROI and learning impact metrics
- ⚡ **Caching** - TTL-based caching for performance
- 📁 **CSV Fallback** - Works without Kusto using local data

## Quick Start

### Prerequisites

- Python 3.11+
- uv (recommended) or pip

### Installation

```bash
cd backend

# Using uv (recommended)
uv venv
source .venv/bin/activate  # or `.venv\Scripts\activate` on Windows
uv pip install -e ".[dev]"

# Or using pip
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# For Kusto (optional - falls back to CSV)
KUSTO_CLUSTER_URL=https://your-cluster.region.kusto.windows.net
KUSTO_DATABASE=your_database

# API settings
API_PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### Running

```bash
# Development with auto-reload
uvicorn app.main:app --reload --port 8000

# Or run directly
python -m app.main
```

### API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Metrics
- `GET /api/metrics` - Dashboard metrics
- `GET /api/metrics/realtime` - Real-time Kusto metrics
- `POST /api/metrics/cache/clear` - Clear cache

### Learners
- `GET /api/learners` - List with filtering & pagination
- `GET /api/learners/search?q=` - Quick search for autocomplete
- `GET /api/learners/{email}` - User profile
- `GET /api/learners/status/{status}` - Filter by status
- `GET /api/learners/certified/recent` - Recent certifications

### Journey
- `GET /api/journey` - Full journey analytics
- `GET /api/journey/funnel` - Funnel data only
- `GET /api/journey/progression` - Monthly progression
- `GET /api/journey/velocity` - Stage velocity
- `GET /api/journey/drop-off` - Drop-off analysis

### Impact
- `GET /api/impact` - Full impact analytics
- `GET /api/impact/by-stage` - Impact by journey stage
- `GET /api/impact/products` - Product adoption
- `GET /api/impact/correlation` - Learning correlation
- `GET /api/impact/roi` - ROI metrics

### Custom Queries
- `POST /api/query` - Execute custom Kusto query
- `GET /api/query/tables` - List available tables
- `GET /api/query/examples` - Query examples

## Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI application
│   ├── config.py         # Settings and configuration
│   ├── models.py         # Pydantic models
│   ├── kusto.py          # Kusto client and queries
│   ├── csv_service.py    # CSV data fallback
│   └── routes/
│       ├── metrics.py    # /api/metrics endpoints
│       ├── learners.py   # /api/learners endpoints
│       ├── journey.py    # /api/journey endpoints
│       ├── impact.py     # /api/impact endpoints
│       └── query.py      # /api/query endpoints
├── tests/
├── pyproject.toml
└── .env.example
```

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Code Quality

```bash
# Format and lint
ruff check --fix .
ruff format .
```

## Docker

```bash
# Build
docker build -t learning-roi-api .

# Run
docker run -p 8000:8000 --env-file .env learning-roi-api
```

## Integration with Next.js Frontend

Update your Next.js app to call the FastAPI backend:

```typescript
// src/lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchMetrics() {
  const res = await fetch(`${API_URL}/api/metrics`);
  return res.json();
}
```
