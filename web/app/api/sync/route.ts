import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ScrapedPlan {
  toolName: string;
  planName: string;
  monthlyPrice: number;
  isFree: boolean;
  primaryModel?: string;
  models?: string[];
  offers: string;
  restrictions?: string;
  usageLimits?: string;
  url?: string;
}

async function loadScraperResults(): Promise<ScrapedPlan[]> {
  const resultsPath = path.join(process.cwd(), '../scraper/results.json');
  
  try {
    if (!fs.existsSync(resultsPath)) {
      return [];
    }
    
    const content = fs.readFileSync(resultsPath, 'utf-8');
    const data = JSON.parse(content);
    
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    return data;
  } catch {
    return [];
  }
}

async function loadSeedData(): Promise<ScrapedPlan[]> {
  const seedPath = path.join(process.cwd(), 'prisma/seed.json');
  
  try {
    const content = fs.readFileSync(seedPath, 'utf-8');
    const data = JSON.parse(content);
    return data.plans || [];
  } catch {
    return [];
  }
}

async function syncPlans(plans: ScrapedPlan[], source: 'scraper' | 'seed'): Promise<number> {
  let synced = 0;
  
  for (const plan of plans) {
    try {
      const modelsJson = plan.models && plan.models.length > 0 
        ? JSON.stringify(plan.models) 
        : null;
      
      await prisma.aiPlan.upsert({
        where: {
          toolName_planName: {
            toolName: plan.toolName,
            planName: plan.planName,
          },
        },
        update: {
          monthlyPrice: plan.monthlyPrice,
          isFree: plan.isFree,
          primaryModel: plan.primaryModel || null,
          models: modelsJson,
          offers: plan.offers,
          restrictions: plan.restrictions || null,
          usageLimits: plan.usageLimits || null,
          url: plan.url || null,
          lastUpdated: new Date(),
          source,
        },
        create: {
          toolName: plan.toolName,
          planName: plan.planName,
          monthlyPrice: plan.monthlyPrice,
          isFree: plan.isFree,
          primaryModel: plan.primaryModel || null,
          models: modelsJson,
          offers: plan.offers,
          restrictions: plan.restrictions || null,
          usageLimits: plan.usageLimits || null,
          url: plan.url || null,
          source,
        },
      });
      synced++;
    } catch (error) {
      console.error(`Error upserting ${plan.toolName} - ${plan.planName}`);
    }
  }
  
  return synced;
}

async function cleanupOrphanPlans(currentPlanIds: string[]): Promise<number> {
  const allScrapedPlans = await prisma.aiPlan.findMany({
    where: { source: 'scraper' },
    select: { id: true, toolName: true, planName: true },
  });
  
  const toDelete = allScrapedPlans.filter(
    plan => !currentPlanIds.includes(`${plan.toolName}-${plan.planName}`)
  );
  
  if (toDelete.length === 0) {
    return 0;
  }
  
  const result = await prisma.aiPlan.deleteMany({
    where: { id: { in: toDelete.map(p => p.id) } },
  });
  
  return result.count;
}

export async function GET() {
  try {
    console.log('Starting data sync...');
    
    let plans = await loadScraperResults();
    let dataSource: 'scraper' | 'seed';
    
    if (plans.length > 0) {
      dataSource = 'scraper';
      console.log(`Using scraper data: ${plans.length} plans`);
    } else {
      plans = await loadSeedData();
      dataSource = 'seed';
      console.log(`Using seed data: ${plans.length} plans`);
      
      if (plans.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No data available',
          message: 'Both scraper and seed data failed',
        });
      }
    }
    
    const synced = await syncPlans(plans, dataSource);
    
    if (dataSource === 'scraper') {
      const planIds = plans.map(p => `${p.toolName}-${p.planName}`);
      await cleanupOrphanPlans(planIds);
    }
    
    const totalPlans = await prisma.aiPlan.count();
    
    console.log(`Sync complete: ${synced} plans synced, ${totalPlans} total`);
    
    return NextResponse.json({
      success: true,
      source: dataSource,
      plansSynced: synced,
      totalPlans,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Sync failed',
      details: String(error),
    });
  } finally {
    await prisma.$disconnect();
  }
}
