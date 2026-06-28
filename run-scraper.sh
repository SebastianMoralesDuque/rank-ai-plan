#!/bin/bash
# AI-Rank Scraper Runner
# Runs the focalizado scraper and syncs results to the database
# Designed to be called by cron every 2 days

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

# Redirect all output to log file
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "============================================================"
echo "AI-Rank Scraper - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"

# Step 1: Run the scraper
echo ""
echo "[Step 1/2] Running focalizado scraper..."
cd "${PROJECT_DIR}"

# Ensure dependencies are available
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
docker cp results.json airank-web:/tmp/results.json

docker exec -e DATABASE_URL="postgresql://postgres:airank@airank-db:5432/airank" airank-web node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const plans = JSON.parse(fs.readFileSync('/tmp/results.json', 'utf-8'));
  let synced = 0;
  for (const plan of plans) {
    try {
      const modelsJson = plan.models && plan.models.length > 0 ? JSON.stringify(plan.models) : null;
      await prisma.aiPlan.upsert({
        where: { toolName_planName: { toolName: plan.toolName, planName: plan.planName } },
        update: {
          monthlyPrice: plan.monthlyPrice, isFree: plan.isFree,
          primaryModel: plan.primaryModel || null, models: modelsJson,
          offers: plan.offers, restrictions: plan.restrictions || null,
          usageLimits: plan.usageLimits || null, url: plan.url || null,
          lastUpdated: new Date(), source: 'scraper',
        },
        create: {
          toolName: plan.toolName, planName: plan.planName,
          monthlyPrice: plan.monthlyPrice, isFree: plan.isFree,
          primaryModel: plan.primaryModel || null, models: modelsJson,
          offers: plan.offers, restrictions: plan.restrictions || null,
          usageLimits: plan.usageLimits || null, url: plan.url || null,
          source: 'scraper',
        },
      });
      synced++;
    } catch (e) { console.error('Error:', plan.toolName, plan.planName, e.message); }
  }
  console.log('Synced:', synced);
  const total = await prisma.aiPlan.count();
  console.log('Total in DB:', total);
}
main().catch(console.error).finally(() => prisma.\$disconnect());
"

echo ""
echo "============================================================"
echo "Scraper run complete - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================================"

# Cleanup old logs (keep last 30)
cd "${LOG_DIR}" && ls -t scraper-*.log | tail -n +31 | xargs -r rm --

exit 0
