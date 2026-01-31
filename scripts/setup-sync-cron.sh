#!/bin/bash
#
# Automated Sync Scheduler for Learner Enrichment
#
# This script sets up a cron job to run the sync script periodically.
# Run with: ./scripts/setup-sync-cron.sh
#
# Options:
#   --install    Install the cron job
#   --uninstall  Remove the cron job
#   --status     Check if cron job is installed
#   --run-now    Run sync immediately

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SYNC_SCRIPT="$PROJECT_DIR/scripts/sync-enriched-learners.py"
PYTHON="$PROJECT_DIR/backend/.venv/bin/python"
LOG_FILE="$PROJECT_DIR/logs/sync.log"
CRON_SCHEDULE="0 6 * * *"  # Daily at 6 AM

# Ensure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

# Create the sync runner script
create_sync_runner() {
    cat > "$PROJECT_DIR/scripts/run-sync.sh" << EOF
#!/bin/bash
# Auto-generated sync runner
# Run the enriched learners sync with logging

cd "$PROJECT_DIR"
echo "=== Sync started at \$(date) ===" >> "$LOG_FILE"
"$PYTHON" "$SYNC_SCRIPT" >> "$LOG_FILE" 2>&1
EXIT_CODE=\$?
echo "=== Sync finished at \$(date) with exit code \$EXIT_CODE ===" >> "$LOG_FILE"
exit \$EXIT_CODE
EOF
    chmod +x "$PROJECT_DIR/scripts/run-sync.sh"
    echo "✅ Created sync runner at scripts/run-sync.sh"
}

install_cron() {
    create_sync_runner
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "sync-enriched-learners"; then
        echo "⚠️  Cron job already installed"
        return
    fi
    
    # Add cron job
    (crontab -l 2>/dev/null || true; echo "$CRON_SCHEDULE $PROJECT_DIR/scripts/run-sync.sh") | crontab -
    echo "✅ Installed cron job: $CRON_SCHEDULE"
    echo "   Logs will be written to: $LOG_FILE"
}

uninstall_cron() {
    crontab -l 2>/dev/null | grep -v "sync-enriched-learners" | grep -v "run-sync.sh" | crontab -
    echo "✅ Removed cron job"
}

check_status() {
    if crontab -l 2>/dev/null | grep -q "sync-enriched-learners\|run-sync.sh"; then
        echo "✅ Cron job is installed:"
        crontab -l | grep -E "sync-enriched-learners|run-sync.sh"
    else
        echo "❌ Cron job is not installed"
    fi
}

run_now() {
    create_sync_runner
    echo "🔄 Running sync now..."
    "$PROJECT_DIR/scripts/run-sync.sh"
    echo "✅ Sync complete. Check logs at: $LOG_FILE"
}

# Parse command line arguments
case "${1:-}" in
    --install)
        install_cron
        ;;
    --uninstall)
        uninstall_cron
        ;;
    --status)
        check_status
        ;;
    --run-now)
        run_now
        ;;
    *)
        echo "Usage: $0 [--install|--uninstall|--status|--run-now]"
        echo ""
        echo "Options:"
        echo "  --install    Install daily cron job (runs at 6 AM)"
        echo "  --uninstall  Remove cron job"
        echo "  --status     Check if cron job is installed"
        echo "  --run-now    Run sync immediately"
        exit 1
        ;;
esac
