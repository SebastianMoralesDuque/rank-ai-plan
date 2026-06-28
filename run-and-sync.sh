#!/bin/bash
# AI-Rank: Run scraper + sync to DB
# Called by cron every 2 days

set -euo pipefail

PROJECT_DIR="/home/ubuntu/projects/airank/scraper"
LOG_DIR="/home/ubuntu/projects/airank/logs"
LOG_FILE="${LOG_DIR}/scraper-$(date +%Y%m%d-%H%M%S).log"

# Ensure log directory exists
mkdir -p "${LOG_DIR}"

# Load environment variables
if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    source "${PROJECT_DIR}/.env"
    set +a
    echo "Loaded .env from ${PROJECT_DIR}/.env"
fi

# Log everything
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "============================================================"
echo "AI-Rank Scraper - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"

# Step 1: Run the scraper
echo ""
echo "[Step 1/2] Running focalizado scraper..."
cd "${PROJECT_DIR}"

python3 focalizado.py

# Check if results were generated
if [ ! -f results.json ]; then
    echo "ERROR: No results.json generated. Aborting sync."
    exit 1
fi

PLAN_COUNT=$(python3 -c "import json; print(len(json.load(open('results.json'))))")
echo "Scraper generated ${PLAN_COUNT} plans"

# Step 2: Sync results to database via Docker
echo ""
echo "[Step 2/2] Syncing results to database..."

# Find the airank container dynamically (Coolify-based naming)
AIRANK_CONTAINER=$(docker ps --filter "label=coolify.serviceName=airank" --format "{{.Names}}" | head -1)

if [ -z "$AIRANK_CONTAINER" ]; then
    echo "ERROR: No airank container found. Aborting sync."
    exit 1
fi

echo "Using container: ${AIRANK_CONTAINER}"

# sync.ts expects results.json at path.join(__dirname, '../../scraper/results.json')
# which resolves to /scraper/results.json (from /app/prisma/)
docker exec "${AIRANK_CONTAINER}" mkdir -p /scraper

# Copy results.json into the container
docker cp results.json "${AIRANK_CONTAINER}:/scraper/results.json"

# Run the existing sync.ts inside the container (handles upsert + orphan cleanup)
# Container already has correct DATABASE_URL from Coolify; no need to pass it
docker exec "${AIRANK_CONTAINER}" npx tsx /app/prisma/sync.ts

echo ""
echo "============================================================"
echo "Scraper run complete - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"

# Cleanup old logs (keep last 30)
cd "${LOG_DIR}" && ls -t scraper-*.log 2>/dev/null | tail -n +31 | xargs -r rm --

exit 0
