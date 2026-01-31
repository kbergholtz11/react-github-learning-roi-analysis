#!/bin/bash
#
# Automated Sync Scheduler for Learner Enrichment
#
# Sets up automated synchronization of Learning ROI data following
# GitHub Data SLOs and best practices.
#
# SLO Reference (from github/data docs):
#   - Canonical tables: Ready by 09:00 UTC (10h from midnight)
#   - Account hierarchy: Ready by 14:00 UTC (14h from midnight)
#   - Hydro to Kusto: 99% within 20 minutes
#   - DB Snapshots: Ready by 09:00 UTC
#
# Recommended Sync Schedule:
#   - Main sync: 11:00 UTC (after canonical SLOs complete)
#   - Aggregation: Every 15 minutes
#   - Quality check: After each sync
#
# Options:
#   --install    Install the cron jobs
#   --uninstall  Remove the cron jobs
#   --status     Check if cron jobs are installed
#   --run-now    Run sync immediately
#   --show       Show recommended schedule

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SYNC_SCRIPT="$PROJECT_DIR/scripts/sync-enriched-learners.py"
QUALITY_SCRIPT="$PROJECT_DIR/scripts/validate-data-quality.py"
AGGREGATE_SCRIPT="$PROJECT_DIR/scripts/aggregate-data.ts"
PYTHON="$PROJECT_DIR/backend/.venv/bin/python"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/sync.log"
QUALITY_LOG="$LOG_DIR/quality.log"
AGGREGATE_LOG="$LOG_DIR/aggregate.log"

# Cron schedule - 11:00 UTC (after canonical SLOs complete)
# 11:00 UTC = 03:00 PST / 06:00 EST
CRON_SCHEDULE_SYNC="0 11 * * *"
CRON_SCHEDULE_QUALITY="30 11 * * *"
CRON_SCHEDULE_AGGREGATE="*/15 * * * *"
CRON_SCHEDULE_BACKUP="0 20 * * *"

# Marker to identify our cron jobs
CRON_MARKER="# Learning-ROI-Sync"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

show_schedule() {
    echo "📅 Recommended Sync Schedule"
    echo "============================"
    echo ""
    echo "Based on GitHub Data SLOs:"
    echo "  - Canonical tables: Ready by 09:00 UTC"
    echo "  - Account hierarchy: Ready by 14:00 UTC"
    echo "  - Hydro to Kusto: ~20 minutes"
    echo ""
    echo "Configured Jobs:"
    echo "  1. Main Sync: 11:00 UTC daily (after canonical SLOs)"
    echo "  2. Quality Check: 11:30 UTC daily"
    echo "  3. Aggregation: Every 15 minutes"
    echo "  4. Backup Sync: 20:00 UTC daily"
    echo ""
}

# Create the sync runner script
create_sync_runner() {
    cat > "$PROJECT_DIR/scripts/run-sync.sh" << EOF
#!/bin/bash
# Auto-generated sync runner with quality check
# Run the enriched learners sync with logging

cd "$PROJECT_DIR"
echo "=== Sync started at \$(date) ===" >> "$LOG_FILE"
"$PYTHON" "$SYNC_SCRIPT" >> "$LOG_FILE" 2>&1
EXIT_CODE=\$?
echo "=== Sync finished at \$(date) with exit code \$EXIT_CODE ===" >> "$LOG_FILE"

# Run quality check after sync
if [ \$EXIT_CODE -eq 0 ]; then
    echo "=== Quality check started at \$(date) ===" >> "$QUALITY_LOG"
    "$PYTHON" "$QUALITY_SCRIPT" >> "$QUALITY_LOG" 2>&1 || true
    echo "=== Quality check finished at \$(date) ===" >> "$QUALITY_LOG"
fi

# Run aggregation
if [ \$EXIT_CODE -eq 0 ]; then
    echo "=== Aggregation started at \$(date) ===" >> "$AGGREGATE_LOG"
    cd "$PROJECT_DIR" && npx tsx "$AGGREGATE_SCRIPT" >> "$AGGREGATE_LOG" 2>&1 || true
    echo "=== Aggregation finished at \$(date) ===" >> "$AGGREGATE_LOG"
fi

exit \$EXIT_CODE
EOF
    chmod +x "$PROJECT_DIR/scripts/run-sync.sh"
    echo "✅ Created sync runner at scripts/run-sync.sh"
}

install_cron() {
    create_sync_runner
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
        echo "⚠️  Cron jobs already installed. Use --uninstall first to update."
        return
    fi
    
    # Get current crontab
    current_cron=$(crontab -l 2>/dev/null || echo "")
    
    # Add cron jobs with marker
    new_cron="$current_cron
$CRON_MARKER - START
# Learning ROI automated data synchronization
# Installed: $(date)
# Main sync at 11:00 UTC (after canonical SLOs)
$CRON_SCHEDULE_SYNC $PROJECT_DIR/scripts/run-sync.sh
# Backup sync at 20:00 UTC
$CRON_SCHEDULE_BACKUP $PROJECT_DIR/scripts/run-sync.sh
$CRON_MARKER - END"
    
    echo "$new_cron" | crontab -
    
    echo "✅ Installed cron jobs:"
    echo "   Main sync: $CRON_SCHEDULE_SYNC (11:00 UTC)"
    echo "   Backup sync: $CRON_SCHEDULE_BACKUP (20:00 UTC)"
    echo "   Logs: $LOG_DIR/"
}

uninstall_cron() {
    current_cron=$(crontab -l 2>/dev/null || echo "")
    
    if ! echo "$current_cron" | grep -q "$CRON_MARKER"; then
        echo "⚠️  No Learning ROI cron jobs found."
        return
    fi
    
    # Remove our jobs (everything between START and END markers)
    new_cron=$(echo "$current_cron" | sed "/$CRON_MARKER - START/,/$CRON_MARKER - END/d")
    echo "$new_cron" | crontab -
    
    echo "✅ Removed cron jobs"
}

check_status() {
    if crontab -l 2>/dev/null | grep -q "$CRON_MARKER"; then
        echo "✅ Learning ROI cron jobs are INSTALLED:"
        echo ""
        crontab -l | grep -A 10 "$CRON_MARKER - START" | head -10
        echo ""
        echo "📝 Recent log activity:"
        if [ -f "$LOG_FILE" ]; then
            echo "Last sync:"
            tail -3 "$LOG_FILE" 2>/dev/null || echo "  No entries"
        fi
    else
        echo "❌ Cron jobs are NOT installed"
        echo "   Run: ./scripts/setup-sync-cron.sh --install"
    fi
}

run_now() {
    create_sync_runner
    echo "🔄 Running sync now..."
    "$PROJECT_DIR/scripts/run-sync.sh"
    echo "✅ Sync complete. Check logs at: $LOG_DIR/"
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
    --show)
        show_schedule
        ;;
    *)
        echo "Learning ROI Data Sync Cron Setup"
        echo "================================="
        echo ""
        echo "Usage: $0 [--install|--uninstall|--status|--run-now|--show]"
        echo ""
        echo "Options:"
        echo "  --install    Install cron jobs (11:00 & 20:00 UTC)"
        echo "  --uninstall  Remove cron jobs"
        echo "  --status     Check if cron jobs are installed"
        echo "  --run-now    Run sync immediately"
        echo "  --show       Show recommended schedule"
        echo ""
        show_schedule
        ;;
esac
