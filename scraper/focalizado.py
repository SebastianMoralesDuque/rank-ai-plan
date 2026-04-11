#!/usr/bin/env python3
import os
import json
import asyncio
import re
from typing import Optional, Dict, List
from dataclasses import dataclass, asdict, field
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
import httpx

OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'https://ollama.com')
OLLAMA_API_KEY = os.environ.get('OLLAMA_API_KEY', '')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'minimax-m2.7:cloud')
OLLAMA_ENABLED = os.environ.get('OLLAMA_ENABLED', 'true').lower() == 'true'

TOOL_MAPPINGS = {
    'cursor.com': {'name': 'Cursor'},
    'github.com': {'name': 'GitHub Copilot'},
    'anthropic.com': {'name': 'Claude'},
    'openai.com': {'name': 'OpenAI'},
    'windsurf.ai': {'name': 'Windsurf'},
    'opencode.ai': {'name': 'OpenCode'},
    'deepseek.com': {'name': 'DeepSeek'},
    'aliyun.com': {'name': 'Qwen'},
    'minimax.io': {'name': 'MiniMax'},
    'bigmodel.cn': {'name': 'GLM'},
    'moonshot.cn': {'name': 'Kimi'},
    'one.google.com': {'name': 'Gemini'},
    'cloud.google.com': {'name': 'Gemini API'},
    'ollama.com': {'name': 'Ollama'},
}

CURRENT_MODELS = {
    'Cursor': ['claude-4.6-opus', 'claude-4.6-sonnet', 'gpt-4o', 'gpt-5.2', 'cursor-small'],
    'GitHub Copilot': ['gpt-4o', 'gpt-4o-mini', 'claude-4.5-sonnet', 'o1'],
    'Claude': ['claude-4.6-opus', 'claude-4.6-sonnet', 'claude-4.5-opus', 'claude-4.5-sonnet'],
    'OpenAI': ['gpt-5.4', 'gpt-4o', 'o1', 'o3', 'o3-mini', 'gpt-4o-mini', 'advanced-voice'],
    'Windsurf': ['claude-4.6-opus', 'claude-4.6-sonnet', 'gpt-4o', 'command-r+'],
    'OpenCode': ['glm-5.1', 'glm-5', 'kimi-k2.5', 'minimax-m2.7', 'minimax-m2.5', 'mimo-v2-pro', 'big-pickle'],
    'Gemini': ['gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    'Gemini API': ['gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    'DeepSeek': ['deepseek-v3', 'deepseek-coder-v3', 'deepseek-chat-v3'],
    'Qwen': ['qwen3.0', 'qwen3.0-turbo', 'qwen2.5-72b', 'qwen2.5-coder-32b'],
    'MiniMax': ['minimax-m2.7', 'minimax-m2.5', 'hailuo-2.3', 'speech-02'],
    'GLM': ['glm-5.1', 'glm-5', 'glm-4v-plus', 'glm-4-plus', 'glm-4-flash'],
    'Kimi': ['kimi-turbo', 'moonshot-v1-32k', 'kimi-coder'],
    'Ollama': ['minimax-m2.7', 'qwen3.5', 'gemma4', 'glm-5.1', 'kimi-k2.5', 'deepseek-v3.2', 'devstral-small-2'],
}

@dataclass
class ScrapedPlan:
    toolName: str
    planName: str
    monthlyPrice: float
    isFree: bool
    primaryModel: Optional[str] = None
    models: List[str] = field(default_factory=list)
    offers: str = ""
    restrictions: Optional[str] = None
    usageLimits: Optional[str] = None
    url: str = ""

def get_tool_name(url: str) -> str:
    if '//' in url:
        domain = url.split('//')[1].split('/')[0]
    else:
        domain = url.split('/')[0]
    
    for key, value in TOOL_MAPPINGS.items():
        if key in domain:
            return value['name']
    
    return domain.split('.')[-1].capitalize()

def get_current_models(tool_name: str) -> List[str]:
    return CURRENT_MODELS.get(tool_name, [])

class OllamaExtractor:
    def __init__(self):
        self.client = None
        self.enabled = OLLAMA_ENABLED and OLLAMA_API_KEY and OLLAMA_MODEL
        if self.enabled:
            try:
                self.client = httpx.Client(
                    base_url=OLLAMA_HOST,
                    timeout=180.0,
                    headers={
                        'Authorization': f'Bearer {OLLAMA_API_KEY}',
                        'Content-Type': 'application/json'
                    }
                )
                print(f"    Ollama client ready (model: {OLLAMA_MODEL})")
            except Exception as e:
                print(f"    Ollama client init failed: {e}")
                self.enabled = False
        
    def extract(self, html_content: str, tool_name: str) -> Optional[List[Dict]]:
        if not self.enabled or not self.client:
            return None
        
        known_models = {
            'Cursor': ['claude-4.6-opus', 'claude-4.6-sonnet', 'gpt-4o', 'gpt-5.2', 'cursor-small'],
            'GitHub Copilot': ['gpt-4o', 'gpt-4o-mini', 'claude-4.5-sonnet', 'o1'],
            'Claude': ['claude-4.6-opus', 'claude-4.6-sonnet', 'claude-4.5-opus', 'claude-4.5-sonnet'],
            'OpenAI': ['gpt-5.4', 'gpt-4o', 'o1', 'o3', 'o3-mini', 'gpt-4o-mini', 'advanced-voice'],
            'Windsurf': ['claude-4.6-opus', 'claude-4.6-sonnet', 'gpt-4o', 'command-r+'],
            'OpenCode': ['glm-5.1', 'glm-5', 'kimi-k2.5', 'minimax-m2.7', 'minimax-m2.5', 'mimo-v2-pro', 'big-pickle'],
            'Gemini': ['gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
            'Gemini API': ['gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
            'DeepSeek': ['deepseek-v3', 'deepseek-coder-v3', 'deepseek-chat-v3'],
            'Qwen': ['qwen3.0', 'qwen3.0-turbo', 'qwen2.5-72b', 'qwen2.5-coder-32b'],
            'MiniMax': ['minimax-m2.7', 'minimax-m2.5', 'hailuo-2.3', 'speech-02'],
            'GLM': ['glm-5.1', 'glm-5', 'glm-4v-plus', 'glm-4-plus', 'glm-4-flash'],
            'Kimi': ['kimi-turbo', 'moonshot-v1-32k', 'kimi-coder'],
            'Ollama': ['minimax-m2.7', 'qwen3.5', 'gemma4', 'glm-5.1', 'kimi-k2.5', 'deepseek-v3.2', 'devstral-small-2'],
        }
        models_context = known_models.get(tool_name, [])
            
        prompt = f"""You are a precise pricing data extractor. Extract ALL pricing plans from this HTML for {tool_name}.

IMPORTANT: 
- Return ONLY valid JSON array, NO markdown, NO explanations
- Use exact model names from this list when available: {', '.join(models_context)}
- For usage limits, extract specific numbers like "500 requests/day", "1M tokens/month", "20 messages/day"
- If a field is unknown, use null (not "unknown" or empty string)

Extract for each plan:
{{"planName":"Name","monthlyPrice":0,"models":["model1"],"offers":"Feature 1, Feature 2","restrictions":"Limitation 1","usageLimits":"Specific numbers"}}

Example for Cursor:
[{{"planName":"Pro","monthlyPrice":20,"models":["claude-4.6-opus","claude-4.6-sonnet","gpt-4o"],"offers":"500 fast requests/day, Unlimited slow requests, Agent mode, Context 200k","restrictions":"No team features","usageLimits":"500 fast/day, unlimited slow"}},{{"planName":"Free","monthlyPrice":0,"models":["claude-4.5-sonnet"],"offers":"50 slow requests/day, Basic autocomplete","restrictions":"No Agent mode","usageLimits":"50 slow/day"}}]
"""
        try:
            response = self.client.post('/api/chat', json={
                'model': OLLAMA_MODEL,
                'messages': [
                    {'role': 'system', 'content': 'You ONLY return valid JSON array.'},
                    {'role': 'user', 'content': prompt},
                    {'role': 'user', 'content': f'HTML content:\n{html_content[:20000]}'}
                ],
                'stream': False,
                'options': {
                    'temperature': 0.1,
                    'num_predict': 3000
                }
            })
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('message', {}).get('content', '')
                content = re.sub(r'^```json\s*|\s*```$', '', content.strip(), flags=re.MULTILINE)
                result = json.loads(content)
                if isinstance(result, list):
                    return result
                return None
            else:
                print(f"    Ollama error: {response.status_code}")
                if response.status_code == 429:
                    print(f"    Rate limit reached")
                return None
        except Exception as e:
            print(f"    Ollama failed: {str(e)[:100]}")
            return None

class FocalizadoScraper:
    def __init__(self):
        self.plans: List[ScrapedPlan] = []
        self.errors: List[Dict] = []
        self.ollama = OllamaExtractor()
        
    async def scrape_url(self, browser, url: str) -> Optional[str]:
        page = await browser.new_page()
        try:
            print(f"  Scraping: {url}")
            await page.goto(url, wait_until='domcontentloaded', timeout=45000)
            await page.wait_for_timeout(3000)
            content = await page.content()
            return content
        except Exception as e:
            print(f"  Error: {e}")
            self.errors.append({'url': url, 'error': str(e)})
            return None
        finally:
            await page.close()

    def extract_plans(self, text: str, tool_name: str, url: str) -> List[ScrapedPlan]:
        plans = []
        current_models = get_current_models(tool_name)
        
        text_lower = text.lower()
        
        price_patterns = [
            (r'(?:pro|premium|plus|standard|starter|turbo|max)[\s:]*\$?(\d+(?:\.\d{2})?)\s*/?\s*(?:mo|month)', 'paid'),
            (r'\$(\d+(?:\.\d{2})?)\s*/\s*(?:mo|month)', 'paid'),
            (r'(?:free|gratuito|免费|without\s*cost)\s*(?:\$0|0)', 'free'),
        ]
        
        has_free = bool(re.search(r'free|gratuito|免费|\$0', text_lower))
        
        paid_prices = []
        for pattern, ptype in price_patterns:
            matches = re.findall(pattern, text_lower)
            for m in matches:
                try:
                    price = float(m)
                    if 0 < price <= 500:
                        paid_prices.append(price)
                except:
                    pass
        
        paid_prices = sorted(set(paid_prices))[:3]
        
        if current_models:
            if paid_prices:
                for price in paid_prices:
                    is_free = price == 0
                    plan = ScrapedPlan(
                        toolName=tool_name,
                        planName='Pro' if not is_free else 'Free',
                        monthlyPrice=price,
                        isFree=is_free,
                        primaryModel=current_models[0],
                        models=current_models,
                        offers='Access to latest AI models' if not is_free else 'Basic access',
                        restrictions='Limited features' if is_free else None,
                        usageLimits='Unlimited' if not is_free else 'Limited daily',
                        url=url
                    )
                    plans.append(plan)
            
            if has_free and not any(p.monthlyPrice == 0 for p in plans):
                plans.append(ScrapedPlan(
                    toolName=tool_name,
                    planName='Free',
                    monthlyPrice=0,
                    isFree=True,
                    primaryModel=current_models[0],
                    models=current_models[:3],
                    offers='Basic access to AI models',
                    restrictions='Limited requests, slower speed',
                    usageLimits='Limited daily requests',
                    url=url
                ))
        
        if not plans:
            plans.append(ScrapedPlan(
                toolName=tool_name,
                planName='Pro',
                monthlyPrice=20,
                isFree=False,
                primaryModel=current_models[0] if current_models else None,
                models=current_models,
                offers='Subscription plan',
                url=url
            ))
        
        return plans

    async def scrape_all(self, urls: List[str]) -> List[ScrapedPlan]:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            for url in urls:
                if not url.strip() or url.startswith('#'):
                    continue
                
                tool_name = get_tool_name(url)
                print(f"\nProcessing: {tool_name}")
                
                raw_html = await self.scrape_url(browser, url)
                if not raw_html:
                    print(f"    Failed, using default data")
                    current_models = get_current_models(tool_name)
                    if current_models:
                        self.plans.append(ScrapedPlan(
                            toolName=tool_name,
                            planName='Pro',
                            monthlyPrice=20,
                            isFree=False,
                            primaryModel=current_models[0],
                            models=current_models,
                            offers='Subscription plan',
                            url=url
                        ))
                    continue
                
                soup = BeautifulSoup(raw_html, 'html.parser')
                for s in soup(["script", "style", "meta", "link", "header", "footer", "nav", "noscript", "iframe", "button"]):
                    s.decompose()
                
                text = soup.get_text(separator=' ', strip=True)
                text = re.sub(r'\s+', ' ', text)[:20000]
                
                llm_plans = self.ollama.extract(raw_html, tool_name) if self.ollama.client else None
                
                if llm_plans and isinstance(llm_plans, list) and len(llm_plans) > 0:
                    print(f"    Ollama extracted {len(llm_plans)} plans")
                    for p_data in llm_plans:
                        if not isinstance(p_data, dict):
                            continue
                        models = p_data.get('models', [])
                        if not models:
                            models = get_current_models(tool_name)
                        
                        monthly_price = p_data.get('monthlyPrice') or 0
                        try:
                            monthly_price = float(monthly_price)
                        except (ValueError, TypeError):
                            monthly_price = 0
                        
                        plan = ScrapedPlan(
                            toolName=tool_name,
                            planName=p_data.get('planName', 'Standard'),
                            monthlyPrice=monthly_price,
                            isFree=monthly_price == 0,
                            primaryModel=models[0] if models else None,
                            models=models,
                            offers=p_data.get('offers', ''),
                            restrictions=p_data.get('restrictions'),
                            usageLimits=p_data.get('usageLimits'),
                            url=url
                        )
                        self.plans.append(plan)
                        price_str = "FREE" if plan.isFree else f"${plan.monthlyPrice}/mo"
                        print(f"    ✓ {plan.planName}: {price_str}")
                else:
                    print(f"    Using regex extraction")
                    regex_plans = self.extract_plans(text, tool_name, url)
                    for plan in regex_plans:
                        self.plans.append(plan)
                        price_str = "FREE" if plan.isFree else f"${plan.monthlyPrice}/mo"
                        models_str = ', '.join(plan.models[:2]) if plan.models else 'N/A'
                        print(f"    ✓ {plan.planName}: {price_str} | {models_str}")
                
                await asyncio.sleep(1)
            
            await browser.close()
        
        return self.plans

def main():
    urls_file = 'urls.txt'
    output_file = 'results.json'
    
    if not os.path.exists(urls_file):
        print(f"Error: {urls_file} not found")
        return
    
    with open(urls_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    
    if not urls:
        print("No URLs found")
        return
    
    print("=" * 60)
    print("DevAI Rank - Focalizado Scraper v2")
    print("=" * 60)
    print(f"URLs: {len(urls)}")
    print(f"Ollama: {'Enabled' if OLLAMA_ENABLED and OLLAMA_API_KEY else 'Disabled'}")
    if OLLAMA_MODEL:
        print(f"Model: {OLLAMA_MODEL}")
    
    scraper = FocalizadoScraper()
    plans = asyncio.run(scraper.scrape_all(urls))
    
    if scraper.errors:
        print(f"\nErrors: {len(scraper.errors)}")
    
    if plans:
        output_data = []
        seen = set()
        for p in plans:
            key = (p.toolName, p.planName)
            if key in seen:
                continue
            seen.add(key)
            
            plan_dict = {
                'toolName': p.toolName,
                'planName': p.planName,
                'monthlyPrice': p.monthlyPrice,
                'isFree': p.isFree,
                'primaryModel': p.primaryModel,
                'models': p.models,
                'offers': p.offers,
                'restrictions': p.restrictions,
                'usageLimits': p.usageLimits,
                'url': p.url,
                'scrapedAt': datetime.now().isoformat()
            }
            output_data.append(plan_dict)
        
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n" + "=" * 60)
        print(f"Saved {len(output_data)} plans to {output_file}")
        print("=" * 60)
        
        tools = {}
        for p in output_data:
            tool = p['toolName']
            if tool not in tools:
                tools[tool] = {'count': 0, 'models': set()}
            tools[tool]['count'] += 1
            tools[tool]['models'].update(p['models'] or [])
        
        print(f"Providers: {len(tools)}")
        for tool, info in sorted(tools.items()):
            models_list = ', '.join(sorted(info['models'])[:5]) if info['models'] else 'N/A'
            print(f"  {tool}: {info['count']} plans | {models_list}")
    else:
        print("\nNo plans scraped.")
        exit(1)

if __name__ == '__main__':
    main()
