import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, SeatStatus } from '@prisma/client';
import { Pool } from 'pg';
import { config } from '../src/config';

const pool = new Pool({
  connectionString: config.DATABASE_URL
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool)
});

type SeatConfig = {
  tierName: string;
  price: number;
  rows: string[];
  perRow: number;
};

const seatConfigs: SeatConfig[] = [
  { tierName: 'VIP', price: 100, rows: ['A', 'B', 'C', 'D'], perRow: 5 },
  { tierName: 'Front Row', price: 50, rows: ['A', 'B', 'C', 'D', 'E'], perRow: 10 },
  {
    tierName: 'GA',
    price: 10,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    perRow: 20
  }
];

const buildSeats = (rows: string[], perRow: number) => {
  const seats: { row: string; number: number; label: string }[] = [];
  rows.forEach((row) => {
    for (let i = 1; i <= perRow; i += 1) {
      seats.push({ row, number: i, label: `${row}${i}` });
    }
  });
  return seats;
};

async function main() {
  for (const config of seatConfigs) {
    const seats = buildSeats(config.rows, config.perRow);
    const totalQuantity = seats.length;

    const tier = await prisma.ticketTier.upsert({
      where: { name: config.tierName },
      update: {
        price: config.price,
        totalQuantity,
        remainingQuantity: totalQuantity
      },
      create: {
        name: config.tierName,
        price: config.price,
        totalQuantity,
        remainingQuantity: totalQuantity
      }
    });

    for (const seat of seats) {
      await prisma.ticketSeat.upsert({
        where: {
          tierId_row_number: {
            tierId: tier.id,
            row: seat.row,
            number: seat.number
          }
        },
        update: {
          label: seat.label,
          status: SeatStatus.AVAILABLE,
          bookingId: null,
          holdToken: null,
          holdExpiresAt: null
        },
        create: {
          tierId: tier.id,
          row: seat.row,
          number: seat.number,
          label: seat.label,
          status: SeatStatus.AVAILABLE
        }
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
