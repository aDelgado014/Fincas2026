import * as schema from './schema.ts';

// Si DATABASE_URL está definido, usa PostgreSQL (Supabase). Si no, SQLite local.
let db: any;
let sqliteInstance: any = null;

if (process.env.DATABASE_URL) {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const postgres = (await import('postgres')).default;
  const client = postgres(process.env.DATABASE_URL, { max: 5 });
  db = drizzle(client, { schema });
  console.log('[DB] Conectado a PostgreSQL (Supabase)');
} else {
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const Database = (await import('better-sqlite3')).default;
  const { resolve } = await import('path');

  const sqlite = new Database('adminfincas.db');
  sqliteInstance = sqlite;
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve('./drizzle') });
  console.log('[DB] Conectado a SQLite local (desarrollo)');
}

export { db, sqliteInstance };
