import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://ticket_user:ticket_pass@localhost:55432/ticket_db?schema=public'
  },
  migrations: {
    seed: 'tsx prisma/seed.ts'
  }
});
