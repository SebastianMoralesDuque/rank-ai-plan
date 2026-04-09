import os
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, JSON, DateTime, UniqueConstraint
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = 'sqlite:///../web/prisma/dev.db'

engine = create_engine(DATABASE_URL)
Base = declarative_base()

class AiPlan(Base):
    __tablename__ = 'AiPlan'
    id = Column(String, primary_key=True)
    toolName = Column(String, nullable=False)
    planName = Column(String, nullable=False)
    monthlyPrice = Column(Float, nullable=False)
    offers = Column(String, nullable=False)
    usageLimits = Column(String, nullable=False)
    lastUpdated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint('toolName', 'planName', name='_tool_plan_uc'),)

Session = sessionmaker(bind=engine)

def normalize_price(price):
    if price is None:
        return 0.0
    if isinstance(price, (int, float)):
        return float(price)
    price_str = str(price).replace('$', '').replace(',', '').strip()
    if price_str.lower() in ['free', '0', 'custom', 'contact us', '']:
        return 0.0
    try:
        return float(price_str)
    except:
        return 0.0

def normalize_models(models):
    if models is None:
        return []
    if isinstance(models, list):
        return [str(m) for m in models]
    if isinstance(models, str):
        return [models]
    return []

def normalize_usage(usage):
    if usage is None:
        return "Not specified"
    if isinstance(usage, dict):
        return json.dumps(usage)
    return str(usage)

def normalize_privacy(privacy):
    if privacy is None or privacy == "":
        return "Not specified"
    return str(privacy)

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
        elif 'tool_name' in data and 'plan_name' in data:
            plans.append(data)
    return plans

def upsert_plan(session, data):
    tool_name = data.get('tool_name') or 'Unknown'
    plan_name = data.get('plan_name') or 'Unknown'
    
    plan_id = f"{tool_name.lower().replace(' ', '-')}-{plan_name.lower().replace(' ', '-')}"
    
    price = normalize_price(data.get('monthly_price'))
    models = normalize_models(data.get('models_included'))
    usage = normalize_usage(data.get('usage_limits'))
    privacy = normalize_privacy(data.get('privacy'))
    
    existing = session.query(AiPlan).filter_by(toolName=tool_name, planName=plan_name).first()
    now = datetime.utcnow()
    
    if existing:
        existing.monthlyPrice = price
        existing.modelsIncluded = models
        existing.usageLimits = usage
        existing.privacy = privacy
        existing.lastUpdated = now
        print(f"  Updated: {tool_name} - {plan_name}")
    else:
        new_plan = AiPlan(
            id=plan_id,
            toolName=tool_name,
            planName=plan_name,
            monthlyPrice=price,
            modelsIncluded=models,
            usageLimits=usage,
            privacy=privacy,
            lastUpdated=now
        )
        session.add(new_plan)
        print(f"  Added: {tool_name} - {plan_name}")

print("Loading results.json...")
with open("results.json", "r") as f:
    raw_data = json.load(f)

all_plans = []
for item in raw_data:
    all_plans.extend(extract_plans(item))

print(f"Found {len(all_plans)} total plans\n")

Base.metadata.create_all(engine)

session = Session()
try:
    for plan in all_plans:
        try:
            upsert_plan(session, plan)
        except Exception as e:
            print(f"  Error with {plan.get('tool_name', 'Unknown')}: {e}")
    
    session.commit()
    print(f"\nImported {len(all_plans)} plans successfully")
except Exception as e:
    print(f"Error: {e}")
    session.rollback()
finally:
    session.close()