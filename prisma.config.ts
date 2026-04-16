import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// The Prisma CLI only loads .env by default, not .env.local.
// We load .env.local first so local dev database URLs take precedence.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
});
