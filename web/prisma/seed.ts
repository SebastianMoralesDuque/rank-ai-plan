import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed script is now empty - all data comes from the agentic discovery agent.');
  console.log('Run "npm run sync" to discover and sync plans from the web.');
  
  const count = await prisma.aiPlan.count();
  console.log(`Current plans in database: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
