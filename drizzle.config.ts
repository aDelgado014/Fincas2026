import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './backend/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'adminfincas.db',
  },
});
