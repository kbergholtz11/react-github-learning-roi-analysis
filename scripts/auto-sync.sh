#!/bin/bash
# Auto-sync data from Kusto clusters
# 
# Usage:
#   ./scripts/auto-sync.sh           # Run full sync
#   ./scripts/auto-sync.sh kusto     # Kusto only
#   ./scripts/auto-sync.sh github    # GitHub API only
#
# Automation (cron):
#   # Run every 6 hours
#   0 */6 * * * cd /path/to/react-github-learning-roi-analysis && ./scripts/auto-sync.sh >> logs/sync.log 2>&1
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_DIR/backend/.venv"
LOG_DIR="$PROJECT_DIR/logs"

# Create logs directory if needed
mkdir -p "$LOG_DIR"

# Activate virtual environment
if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
else
    echo "Error: Virtual environment not found at $VENV_DIR"
    echo "Run: cd backend && python -m venv .venv && pip install -r requirements.txt"
    exit 1
fi

# Run sync
cd "$PROJECT_DIR"

case "${1:-full}" in
    kusto)
        echo "$(date): Running Kusto-only sync..."
        python scripts/sync-all-data.py --kusto-only
        ;;
    github)
        echo "$(date): Running GitHub API-only sync..."
        python scripts/sync-all-data.py --github-only
        ;;
    full|*)
        echo "$(date): Running full data sync..."
        python scripts/sync-all-data.py
        ;;
esac

echo "$(date): Sync complete!"
