import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function sync() {
  const filePath = path.join(__dirname, '..', 'results.json');
  if (!fs.existsSync(filePath)) {
    console.error('results.json not found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Syncing ${data.length} plans...`);

  const sanitize = (str: string) => {
    if (!str) return '';
    // Remove null bytes and other common problematic characters for SQLite/Prisma conversion
    return str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  };

  for (const plan of data) {
    if (!plan.tool_name || !plan.plan_name) {
      console.warn(`Skipping incomplete plan: ${JSON.stringify(plan)}`);
      continue;
    }

    const planId = `${plan.tool_name.toLowerCase().replace(/ /g, '-')}-${plan.plan_name.toLowerCase().replace(/ /g, '-')}`;
    
    const offers = typeof plan.offers === 'string' ? plan.offers : (Array.isArray(plan.offers) ? plan.offers.join(', ') : String(plan.offers || 'Not specified'));
    
    await prisma.aiPlan.upsert({
      where: { toolName_planName: { toolName: plan.tool_name, planName: plan.plan_name } },
      update: {
        monthlyPrice: parseFloat(plan.monthly_price) || 0,
        offers: sanitize(offers),
        url: plan.url || "",
      },
      create: {
        id: planId,
        toolName: plan.tool_name,
        planName: plan.plan_name,
        monthlyPrice: parseFloat(plan.monthly_price) || 0,
        offers: sanitize(offers),
        url: plan.url || "",
      },
    });
  }

  console.log('Sync complete.');
}

sync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
