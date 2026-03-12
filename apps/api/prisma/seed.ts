import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tiers = [
    { name: 'VIP', price: 100, totalQuantity: 20 },
    { name: 'Front Row', price: 50, totalQuantity: 50 },
    { name: 'GA', price: 10, totalQuantity: 200 }
  ];

  for (const tier of tiers) {
    await prisma.ticketTier.upsert({
      where: { name: tier.name },
      update: {
        price: tier.price,
        totalQuantity: tier.totalQuantity,
        remainingQuantity: tier.totalQuantity
      },
      create: {
        name: tier.name,
        price: tier.price,
        totalQuantity: tier.totalQuantity,
        remainingQuantity: tier.totalQuantity
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
