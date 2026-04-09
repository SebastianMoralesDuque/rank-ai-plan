import os
import json
import asyncio
import re
from datetime import datetime
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from ollama import Client
from sqlalchemy import create_engine, Column, String, Float, JSON, UniqueConstraint, DateTime, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///../web/prisma/dev.db')
OLLAMA_API_KEY = os.environ.get('OLLAMA_API_KEY')

engine = create_engine(DATABASE_URL)
Base = declarative_base()

class AiPlan(Base):
    __tablename__ = 'AiPlan'
    id = Column(String, primary_key=True)
    toolName = Column(String, nullable=False)
    planName = Column(String, nullable=False)
    monthlyPrice = Column(Float, nullable=False)
    offers = Column(String, nullable=False)
    url = Column(String, nullable=True)
    lastUpdated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint('toolName', 'planName', name='_tool_plan_uc'),)

Session = sessionmaker(bind=engine)

client = None
if OLLAMA_API_KEY:
    client = Client(
        host="https://ollama.com",
        headers={'Authorization': 'Bearer ' + OLLAMA_API_KEY}
    )

async def scrape_url(browser, url):
    page = await browser.new_page()
    try:
        print(f"Scraping {url}...")
        await page.goto(url, wait_until="networkidle", timeout=60000)
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        for s in soup(["script", "style", "meta", "link", "header", "footer", "nav"]):
            s.decompose()
        text = soup.get_text(separator=' ', strip=True)
        text = re.sub(r'\s+', ' ', text)
        return text[:10000]
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None
    finally:
        await page.close()

def sanitize_string(s):
    if not s:
        return ""
    if not isinstance(s, str):
        s = str(s)
    # Remove null bytes and non-printable control characters
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', s)

def normalize_price(price):
    if price is None:
        return 0.0
    s = str(price).lower().strip()
    if 'free' in s or s == '0' or s == '0.0':
        return 0.0
    # Extract numbers including decimals
    nums = re.findall(r"[-+]?\d*\.\d+|\d+", s)
    if nums:
        return float(nums[0])
    return 0.0

def normalize_offers(offers):
    if not offers:
        return "Not specified"
    
    sanitized = []
    if isinstance(offers, list):
        for item in offers:
            sanitized.append(sanitize_string(item))
        return "; ".join(sanitized)
    
    return sanitize_string(offers)

def extract_plans(data):
    plans = []
    if data is None:
        return plans
    if isinstance(data, list):
        for item in data:
            plans.extend(extract_plans(item))
        return plans
    if isinstance(data, dict):
        if 'plans' in data:
            for plan in data['plans']:
                plan['tool_name'] = data.get('tool_name', 'Unknown')
                plans.append(plan)
        elif 'plan_name' in data:
            plans.append(data)
    return plans

def extract_data_with_llm(raw_text, tool_name_hint=""):
    if not client:
        print(f"ERROR: No API Key provided")
        return None

    prompt = (
        "Extract the following data from this AI tool pricing page text. "
        "Act as a data extractor and return ONLY a valid JSON array of plans. "
        "Each plan should have exactly these keys: plan_name, monthly_price, \"offers\": \"Description of everything the plan includes, including key features and usage/request limits\" "
        "If no usage limits are explicitly found, describe the main features. Focus on making the 'offers' text clear and concise for a programmer. "
        f"\n\nText: {raw_text}"
    )

    try:
        response = client.generate(model='gemma4:31b-cloud', prompt=prompt)
        response_text = re.sub(r'^```json\s*|\s*```$', '', response['response'].strip(), flags=re.MULTILINE)
        return json.loads(response_text)
    except Exception as e:
        print(f"Error with LLM extraction: {e}")
        return None

def upsert_plan(session, data):
    tool_name = data.get('tool_name') or 'Unknown'
    plan_name = data.get('plan_name') or 'Unknown'
    
    query = f"INSERT INTO AiPlan (id, toolName, planName, monthlyPrice, offers, url, lastUpdated) " \
            f"VALUES (:id, :toolName, :planName, :monthlyPrice, :offers, :url, :lastUpdated) " \
            f"ON CONFLICT(toolName, planName) DO UPDATE SET " \
            f"monthlyPrice=excluded.monthlyPrice, offers=excluded.offers, url=excluded.url, " \
            f"lastUpdated=excluded.lastUpdated"
    
    session.execute(text(query), {
        'id': data.get('id', f"{tool_name.lower()}-{plan_name.lower()}"),
        'toolName': tool_name,
        'planName': plan_name,
        'monthlyPrice': normalize_price(data.get('monthly_price')),
        'offers': normalize_offers(data.get('offers')),
        'url': data.get('url', ''),
        'lastUpdated': datetime.utcnow()
    })
    print(f"  Upserted: {tool_name} - {plan_name}")

async def main():
    if not client:
        print("ERROR: OLLAMA_API_KEY not configured")
        return

    with open("urls.txt", "r") as f:
        urls = [line.strip() for line in f if line.strip()]

    Base.metadata.create_all(engine)
    
    all_plans = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for url in urls:
            raw_text = await scrape_url(browser, url)
            if raw_text:
                domain = url.split('//')[-1].split('/')[0]
                tool_name = domain.split('.')[-2].capitalize() if '.' in domain else domain

                data = extract_data_with_llm(raw_text, tool_name_hint=f"Updated {tool_name}")
                if data:
                    plans = extract_plans(data)
                    print(f"  Found {len(plans)} plans for {tool_name}")
                    
                    session = Session()
                    try:
                        for plan in plans:
                            plan['tool_name'] = plan.get('tool_name') or tool_name
                            plan['monthly_price'] = normalize_price(plan.get('monthly_price'))
                            plan['url'] = url
                            upsert_plan(session, plan)
                            all_plans.append(plan)
                        session.commit()
                    except Exception as e:
                        print(f"  Error: {e}")
                        session.rollback()
                    finally:
                        session.close()
        await browser.close()

    with open("results.json", "w") as f:
        json.dump(all_plans, f, indent=2)
    print(f"\nScraper finished. Saved {len(all_plans)} plans to results.json")

    print("\n" + "="*50)
    print("Syncing to web database...")
    print("="*50)

    import shutil
    import subprocess

    web_results_path = "../web/results.json"
    shutil.copy("results.json", web_results_path)
    print(f"  Copied results.json to {web_results_path}")

    sync_script = "../web/prisma/sync.ts"
    try:
        result = subprocess.run(
            ["npx", "tsx", sync_script],
            cwd="../web",
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("  ✓ Sync completed successfully")
        else:
            print(f"  ✗ Sync failed: {result.stderr}")
    except Exception as e:
        print(f"  ✗ Sync error: {e}")

if __name__ == "__main__":
    asyncio.run(main())