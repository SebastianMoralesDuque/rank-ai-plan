#!/bin/bash
set -euo pipefail

# Airank Daily Scraper Runner
# Runs focalizado.py to scrape pricing data, then syncs to DB via Prisma

SCRAPER_DIR="/home/ubuntu/projects/airank/scraper"
WEB_DIR="/home/ubuntu/projects/airank/web"

# Load environment variables
set -a
source "${SCRAPER_DIR}/.env"
set +a

echo "========================================"
echo "Airank Daily Scraper - $(date)"
echo "========================================"

# Step 1: Run scraper
echo "[1/2] Running focalizado.py..."
cd "${SCRAPER_DIR}"
source "${SCRAPER_DIR}/venv/bin/activate"
python3 "${SCRAPER_DIR}/focalizado.py"

# Step 2: Sync to database
echo "[2/2] Syncing to database..."
cd "${WEB_DIR}"
npx tsx prisma/sync.ts

echo "========================================"
echo "Scraper finished successfully - $(date)"
echo "========================================"
