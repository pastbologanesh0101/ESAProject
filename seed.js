const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Clearing old data...");
  await prisma.eventLog.deleteMany();
  await prisma.instrument.deleteMany();

  console.log("Registering test instruments...");
  
  // Registering dummy tags with instrument names
  const instrument1 = await prisma.instrument.create({
    data: { rfidUid: 'TAG_001', name: 'Scalpel' }
  });
  
  const instrument2 = await prisma.instrument.create({
    data: { rfidUid: 'TAG_002', name: 'Tissue Forceps' }
  });

  const instrument3 = await prisma.instrument.create({
    data: { rfidUid: 'TAG_003', name: 'Surgical Scissors' }
  });

  console.log("Database seeded successfully!");
  console.log([instrument1, instrument2, instrument3]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });