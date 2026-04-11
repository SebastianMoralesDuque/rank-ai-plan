import os
import json
import asyncio
import re
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from datetime import datetime
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

load_dotenv()

OLLAMA_API_KEY = os.environ.get('OLLAMA_API_KEY')
OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'https://ollama.com')

TOOL_MAPPINGS = {
    'cursor.com': {'name': 'Cursor', 'type': 'ide'},
    'github.com': {'name': 'GitHub Copilot', 'type': 'ide'},
    'windsurf.ai': {'name': 'Windsurf', 'type': 'ide'},
    'anthropic.com': {'name': 'Claude', 'type': 'ide'},
    'opencode.ai': {'name': 'Opencode', 'type': 'ide'},
    'minimax.io': {'name': 'Minimax', 'type': 'ide'},
}

@dataclass
class Plan:
    tool_name: str
    plan_name: str
    monthly_price: float
    offers: str
    url: str
    source: str = 'scraper'

class SimpleScraper:
    def __init__(self):
        self.plans: List[Plan] = []
        self.ollama_client = None
        
        if OLLAMA_API_KEY:
            try:
                from ollama import Client
                self.ollama_client = Client(
                    host=OLLAMA_HOST,
                    headers={'Authorization': f'Bearer {OLLAMA_API_KEY}'}
                )
            except ImportError:
                print("Warning: ollama package not installed, using fallback parser")

    async def scrape_url(self, browser, url: str) -> Optional[str]:
        page = await browser.new_page()
        try:
            print(f"  Scraping: {url}")
            await page.goto(url, wait_until="networkidle", timeout=60000)
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            for s in soup(["script", "style", "meta", "link", "header", "footer", "nav", "noscript"]):
                s.decompose()
            
            text = soup.get_text(separator=' ', strip=True)
            text = re.sub(r'\s+', ' ', text)
            return text[:12000]
        except Exception as e:
            print(f"  Error: {e}")
            return None
        finally:
            await page.close()

    def extract_with_llm(self, text: str, tool_name: str) -> Optional[List[Dict]]:
        if not self.ollama_client:
            return None
            
        prompt = f"""Extract pricing plans from this text for {tool_name}.
Return ONLY a valid JSON array with this exact structure:
[{{"plan_name": "Plan Name", "monthly_price": 20, "offers": "Key features and limits"}}]

Focus on: plan name, price in USD/month, main features and usage limits.
Text: {text[:8000]}"""

        try:
            response = self.ollama_client.generate(
                model='qwen2.5-coder:14b',
                prompt=prompt,
                options={'temperature': 0.1}
            )
            response_text = response['response'].strip()
            response_text = re.sub(r'^```json\s*|\s*```$', '', response_text, flags=re.MULTILINE)
            return json.loads(response_text)
        except Exception as e:
            print(f"  LLM extraction error: {e}")
            return None

    def extract_with_regex(self, text: str, url: str) -> List[Dict]:
        plans = []
        tool_name = TOOL_MAPPINGS.get(url.split('//')[1].split('/')[0], {}).get('name', 'Unknown')
        
        price_patterns = [
            r'\$?\s*(\d+(?:\.\d{2})?)\s*(?:/mo|/month|/monthly)?',
            r'(\d+(?:\.\d{2})?)\s*dollars?\s*(?:per\s*)?(?:month|mo)',
        ]
        
        price_matches = []
        for pattern in price_patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                price = float(match)
                if 0 < price <= 100:
                    price_matches.append(price)
        
        plan_names = re.findall(r'(?:plan|tier|subscription|option)\s*:?\s*([A-Za-z0-9\s+\-]+?)(?:\s*\d|\s*\$|\s*,|\s*\n|$)', text, re.IGNORECASE)
        
        if price_matches:
            unique_prices = list(dict.fromkeys(price_matches))[:3]
            for i, price in enumerate(unique_prices):
                plan_name = plan_names[i].strip() if i < len(plan_names) else f"Plan {i+1}"
                plans.append({
                    'plan_name': re.sub(r'[^a-zA-Z0-9\s\-+]', '', plan_name) or f"Plan {i+1}",
                    'monthly_price': price,
                    'offers': f'${price}/month subscription'
                })
        
        if not plans:
            plans.append({
                'plan_name': 'Standard',
                'monthly_price': 0,
                'offers': 'Pricing not available'
            })
        
        return plans

    def normalize_price(self, price: Any) -> float:
        if price is None:
            return 0
        if isinstance(price, (int, float)):
            return float(price)
        s = str(price).lower().strip()
        if 'free' in s or s in ['0', '0.0', '']:
            return 0
        match = re.search(r'[-+]?\d*\.?\d+', s)
        return float(match.group()) if match else 0

    def create_plan(self, data: Dict, tool_name: str, url: str) -> Plan:
        return Plan(
            tool_name=tool_name,
            plan_name=data.get('plan_name', 'Unknown'),
            monthly_price=self.normalize_price(data.get('monthly_price')),
            offers=data.get('offers', 'Not specified'),
            url=url,
            source='scraper'
        )

    async def scrape_all(self, urls: List[str]) -> List[Plan]:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            for url in urls:
                if not url.strip():
                    continue
                
                domain = url.split('//')[1].split('/')[0]
                tool_info = TOOL_MAPPINGS.get(domain, {'name': domain.split('.')[-1].capitalize()})
                tool_name = tool_info['name']
                
                print(f"\nProcessing: {tool_name}")
                
                raw_text = await self.scrape_url(browser, url)
                if not raw_text:
                    continue
                
                data = self.extract_with_llm(raw_text, tool_name)
                
                if not data:
                    print("  Using fallback regex parser")
                    data = self.extract_with_regex(raw_text, url)
                
                if data:
                    for item in data:
                        plan = self.create_plan(item, tool_name, url)
                        self.plans.append(plan)
                        print(f"    ✓ {plan.plan_name}: ${plan.monthly_price}")
            
            await browser.close()
        
        return self.plans

def main():
    urls_file = 'urls.txt'
    output_file = 'results.json'
    
    if not os.path.exists(urls_file):
        print(f"Error: {urls_file} not found")
        return
    
    with open(urls_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    if not urls:
        print("No URLs found")
        return
    
    print("=" * 50)
    print("DevAI Rank Scraper (Fallback Mode)")
    print("=" * 50)
    print(f"URLs: {len(urls)}")
    
    scraper = SimpleScraper()
    plans = asyncio.run(scraper.scrape_all(urls))
    
    with open(output_file, 'w') as f:
        json.dump([asdict(p) for p in plans], f, indent=2)
    
    print("\n" + "=" * 50)
    print(f"Done! Scraped {len(plans)} plans")
    print(f"Saved to: {output_file}")
    print("=" * 50)
    
    print("\nNext: Run 'npx tsx prisma/sync.ts' in web/ to sync data")

if __name__ == '__main__':
    main()
