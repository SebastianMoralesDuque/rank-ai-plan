import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      id: 'cursor-pro',
      toolName: 'Cursor',
      planName: 'Pro',
      monthlyPrice: 20.0,
      modelsIncluded: ['Claude 3.5 Sonnet', 'GPT-4o', 'Cursor-Small'],
      usageLimits: 'Unlimited completions, 500 fast requests',
      privacy: 'Zero-retention mode available',
    },
    {
      id: 'github-copilot-individual',
      toolName: 'GitHub Copilot',
      planName: 'Individual',
      monthlyPrice: 10.0,
      modelsIncluded: ['GPT-4o', 'Claude 3.5 Sonnet'],
      usageLimits: 'Unlimited completions',
      privacy: 'Standard GitHub privacy terms',
    },
    {
      id: 'windsurf-pro',
      toolName: 'Windsurf',
      planName: 'Pro',
      monthlyPrice: 20.0,
      modelsIncluded: ['Claude 3.5 Sonnet', 'GPT-4o'],
      usageLimits: 'Unlimited flow, unlimited completions',
      privacy: 'Private by default',
    },
    {
      id: 'claude-pro-pro',
      toolName: 'Claude Pro',
      planName: 'Pro',
      monthlyPrice: 20.0,
      modelsIncluded: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku', 'Claude 3 Opus'],
      usageLimits: '5x more usage than free tier',
      privacy: 'Standard Anthropic terms',
    }
  ];

  for (const plan of plans) {
    await prisma.aiPlan.upsert({
      where: { toolName_planName: { toolName: plan.toolName, planName: plan.planName } },
      update: plan,
      create: plan,
    });
  }

  console.log('Seed data inserted successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
