import { PrismaClient } from '@prisma/client';

// Real Pantex Embalagens Industriais warehouse layout: 3 shelves ("racks"),
// each with 5 levels (A bottom to E top). Positions per level are counted
// from the end closest to Expedição (position 1 = nearest Expedição), and
// each physical location holds 2 pallet positions side by side.
const prisma = new PrismaClient();

const shelvesData = [
  { title: 'Estante 1', locations: 18 }, // 36 positions/level
  { title: 'Estante 2', locations: 8 }, // 16 positions/level
  { title: 'Estante 3', locations: 5 }, // 10 positions/level
];

const levels = ['A', 'B', 'C', 'D', 'E'];

async function main() {
  console.log('Seeding real warehouse layout...');

  for (const shelfData of shelvesData) {
    const shelf = await prisma.shelf.create({
      data: { title: shelfData.title, locations: shelfData.locations },
    });

    const positionsPerLevel = shelfData.locations * 2;
    for (const level of levels) {
      for (let number = 1; number <= positionsPerLevel; number++) {
        await prisma.position.create({
          data: { shelfId: shelf.id, level, number, status: 'FREE' },
        });
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
