import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './backend/db/schema.pg.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  },
});
