import { PrismaClient } from '@prisma/client';

// Real Pantex Embalagens Industriais warehouse layout: 3 shelves ("racks"),
// each with 5 levels (A bottom to E top). Positions per level are counted
// from the end closest to Expedição (position 1 = nearest Expedição), and
// each physical location holds 2 pallet positions side by side.
//
// Numbers are GLOBALLY continuous across shelves, not reset to 1 per shelf
// (matches the one-off production renumbering in
// prisma/renumber-positions.ts — Estante 1 keeps 1-36 since it's first,
// Estante 2 continues at 37-52, Estante 3 at 53-62). Each shelf's starting
// number is simply the previous shelves' combined positions-per-level, kept
// as a running total below instead of hardcoded, so this stays correct if
// shelvesData ever changes.
const prisma = new PrismaClient();

const shelvesData = [
  { title: 'Estante 1', locations: 18 }, // 36 positions/level -> numbers 1-36
  { title: 'Estante 2', locations: 8 }, // 16 positions/level -> numbers 37-52
  { title: 'Estante 3', locations: 5 }, // 10 positions/level -> numbers 53-62
];

const levels = ['A', 'B', 'C', 'D', 'E'];

async function main() {
  console.log('Seeding real warehouse layout...');

  let numberOffset = 0;
  for (const shelfData of shelvesData) {
    const shelf = await prisma.shelf.create({
      data: { title: shelfData.title, locations: shelfData.locations },
    });

    const positionsPerLevel = shelfData.locations * 2;
    for (const level of levels) {
      for (let number = 1; number <= positionsPerLevel; number++) {
        await prisma.position.create({
          data: { shelfId: shelf.id, level, number: numberOffset + number, status: 'FREE' },
        });
      }
    }
    numberOffset += positionsPerLevel;
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
