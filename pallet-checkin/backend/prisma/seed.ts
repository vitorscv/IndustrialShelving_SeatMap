import { PrismaClient, PositionStatus } from '@prisma/client';

// MOCK / PLACEHOLDER DATA — the real floor plan (aisles, levels, positions
// per shelf) has not been surveyed yet. This layout (2 shelves x 3 levels x
// 8 positions) exists only so the frontend has realistic data to develop
// against, and must be replaced once the real warehouse layout is known.

const prisma = new PrismaClient();

const MOCK_SHELVES = [
  { title: 'Prateleira A', aisle: 'Corredor 1' },
  { title: 'Prateleira B', aisle: 'Corredor 2' },
];

const LEVELS_PER_SHELF = 3;
const POSITIONS_PER_LEVEL = 8;

// A handful of positions pre-marked OCCUPIED so the UI has something to show.
const OCCUPIED_SEED_PALLETS = [
  'PLT-0001',
  'PLT-0002',
  'PLT-0003',
  'PLT-0004',
  'PLT-0005',
];

async function main() {
  console.log('Seeding mock warehouse layout...');

  let occupiedIndex = 0;

  for (const shelfData of MOCK_SHELVES) {
    const shelf = await prisma.shelf.create({ data: shelfData });

    for (let level = 1; level <= LEVELS_PER_SHELF; level++) {
      for (let number = 1; number <= POSITIONS_PER_LEVEL; number++) {
        // Occupy a few positions deterministically (every 5th slot) up to
        // the number of mock pallet codes we have.
        const shouldOccupy =
          occupiedIndex < OCCUPIED_SEED_PALLETS.length &&
          (level * POSITIONS_PER_LEVEL + number) % 5 === 0;

        const position = await prisma.position.create({
          data: {
            shelfId: shelf.id,
            level,
            number,
            status: shouldOccupy ? PositionStatus.OCCUPIED : PositionStatus.FREE,
            palletCode: shouldOccupy ? OCCUPIED_SEED_PALLETS[occupiedIndex] : null,
          },
        });

        if (shouldOccupy) {
          await prisma.movement.create({
            data: {
              positionId: position.id,
              type: 'CHECK_IN',
              palletCode: OCCUPIED_SEED_PALLETS[occupiedIndex],
              operatorName: 'Seed Script',
            },
          });
          occupiedIndex++;
        }
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
