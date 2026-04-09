import os
import json
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Float, JSON, DateTime, UniqueConstraint
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
engine = create_engine(DATABASE_URL)

from sqlalchemy.orm import declarative_base
Base = declarative_base()

class AiPlan(Base):
    __tablename__ = 'AiPlan'
    id = Column(String, primary_key=True)
    toolName = Column(String, nullable=False)
    planName = Column(String, nullable=False)
    monthlyPrice = Column(Float, nullable=False)
    modelsIncluded = Column(JSON, nullable=False)
    usageLimits = Column(String, nullable=False)
    privacy = Column(String, nullable=False)
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
    
    stmt = insert(AiPlan).values(
        id=plan_id,
        toolName=tool_name,
        planName=plan_name,
        monthlyPrice=price,
        modelsIncluded=models,
        usageLimits=usage,
        privacy=privacy
    )
    on_conflict_stmt = stmt.on_conflict_do_update(
        index_elements=['toolName', 'planName'],
        set_={
            'monthlyPrice': price,
            'modelsIncluded': models,
            'usageLimits': usage,
            'privacy': privacy,
            'lastUpdated': datetime.utcnow()
        }
    )
    session.execute(on_conflict_stmt)

with open("results.json", "r") as f:
    raw_data = json.load(f)

all_plans = []
for item in raw_data:
    all_plans.extend(extract_plans(item))

print(f"Found {len(all_plans)} total plans")

session = Session()
try:
    Base.metadata.create_all(engine)
    print("Created tables")
    
    for plan in all_plans:
        try:
            upsert_plan(session, plan)
            print(f"  ✓ {plan.get('tool_name')} - {plan.get('plan_name')}")
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    session.commit()
    print(f"\nImported {len(all_plans)} plans successfully")
except Exception as e:
    print(f"Error: {e}")
    session.rollback()
finally:
    session.close()