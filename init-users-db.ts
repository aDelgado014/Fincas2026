import Database from 'better-sqlite3';

const db = new Database('adminfincas.db');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'operator',
      email_verified TEXT,
      image TEXT
    );
  `);
  console.log('Users table ensured.');
} catch (e) {
  console.error('Error creating users table:', e);
} finally {
  db.close();
}
