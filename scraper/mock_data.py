import os
import json
import sqlite3
from datetime import datetime

# Path to the SQLite database
DB_PATH = "/home/sebastian/Descargas/ORACLE/rank-ai-plan/web/prisma/dev.db"

mock_plans = [
    {
        "id": "cursor-pro",
        "toolName": "Cursor",
        "planName": "Pro",
        "monthlyPrice": 20.0,
        "modelsIncluded": json.dumps(["Claude 3.5 Sonnet", "GPT-4o", "Cursor-Small"]),
        "usageLimits": "Unlimited completions, 500 fast requests",
        "privacy": "Zero-retention mode available",
        "lastUpdated": datetime.utcnow().isoformat()
    },
    {
        "id": "github-copilot-individual",
        "toolName": "GitHub Copilot",
        "planName": "Individual",
        "monthlyPrice": 10.0,
        "modelsIncluded": json.dumps(["GPT-4o", "Claude 3.5 Sonnet"]),
        "usageLimits": "Unlimited completions",
        "privacy": "Standard GitHub privacy terms",
        "lastUpdated": datetime.utcnow().isoformat()
    },
    {
        "id": "windsurf-pro",
        "toolName": "Windsurf",
        "planName": "Pro",
        "monthlyPrice": 20.0,
        "modelsIncluded": json.dumps(["Claude 3.5 Sonnet", "GPT-4o"]),
        "usageLimits": "Unlimited flow, unlimited completions",
        "privacy": "Private by default",
        "lastUpdated": datetime.utcnow().isoformat()
    },
    {
        "id": "claude-pro-pro",
        "toolName": "Claude Pro",
        "planName": "Pro",
        "monthlyPrice": 20.0,
        "modelsIncluded": json.dumps(["Claude 3.5 Sonnet", "Claude 3.5 Haiku", "Claude 3 Opus"]),
        "usageLimits": "5x more usage than free tier",
        "privacy": "Standard Anthropic terms",
        "lastUpdated": datetime.utcnow().isoformat()
    }
]

def insert_mock_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table if it doesn't exist (though prisma should do it)
    # But just in case, we use INSERT OR REPLACE
    for plan in mock_plans:
        cursor.execute('''
            INSERT OR REPLACE INTO AiPlan (id, toolName, planName, monthlyPrice, modelsIncluded, usageLimits, privacy, lastUpdated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (plan['id'], plan['toolName'], plan['planName'], plan['monthlyPrice'], plan['modelsIncluded'], plan['usageLimits'], plan['privacy'], plan['lastUpdated']))
    
    conn.commit()
    conn.close()
    print("Mock data inserted via SQLite successfully.")

if __name__ == "__main__":
    insert_mock_data()
