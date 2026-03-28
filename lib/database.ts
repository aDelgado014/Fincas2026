import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('adminfincas.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Communities
  db.exec(`
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT,
      nif TEXT,
      address TEXT,
      bankAccountRef TEXT,
      status TEXT DEFAULT 'active'
    )
  `);

  // Tenants
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      email TEXT,
      phone TEXT,
      taxId TEXT
    )
  `);

  // Units (Updated with tenantId)
  db.exec(`
    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      communityId TEXT,
      unitCode TEXT,
      floor TEXT,
      door TEXT,
      type TEXT,
      coefficient REAL,
      active INTEGER DEFAULT 1,
      tenantId TEXT,
      FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY(tenantId) REFERENCES tenants(id) ON DELETE SET NULL
    )
  `);

  // Owners
  db.exec(`
    CREATE TABLE IF NOT EXISTS owners (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      email TEXT,
      phone TEXT,
      taxId TEXT,
      mailingAddress TEXT
    )
  `);

  // UnitOwners relationship
  db.exec(`
    CREATE TABLE IF NOT EXISTS unit_owners (
      id TEXT PRIMARY KEY,
      unitId TEXT,
      ownerId TEXT,
      ownershipPercentage REAL,
      FOREIGN KEY(unitId) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY(ownerId) REFERENCES owners(id) ON DELETE CASCADE
    )
  `);

  // Transactions (Bank movements)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      communityId TEXT,
      transactionDate TEXT,
      description TEXT,
      amount REAL,
      direction TEXT, -- 'inbound' or 'outbound'
      category TEXT,
      reviewStatus TEXT DEFAULT 'pending',
      matchedDebtId TEXT,
      FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE
    )
  `);

  // Debts and Collections
  db.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      communityId TEXT,
      unitId TEXT,
      ownerId TEXT,
      concept TEXT,
      amount REAL,
      dueDate TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
      paidAt TEXT,
      paymentMethod TEXT,
      FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY(unitId) REFERENCES units(id) ON DELETE CASCADE,
      FOREIGN KEY(ownerId) REFERENCES owners(id) ON DELETE CASCADE
    )
  `);

  // Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT,
      entityType TEXT,
      entityId TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      details TEXT
    )
  `);

  // Providers
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      phone TEXT,
      email TEXT,
      rating REAL
    )
  `);

  // Incidents
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      communityId TEXT,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
      priority TEXT DEFAULT 'medium',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      providerId TEXT,
      cost REAL,
      FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE,
      FOREIGN KEY(providerId) REFERENCES providers(id)
    )
  `);

  // Bank Statements
  db.exec(`
    CREATE TABLE IF NOT EXISTS bank_statements (
      id TEXT PRIMARY KEY,
      fileName TEXT,
      uploadDate TEXT DEFAULT CURRENT_TIMESTAMP,
      communityId TEXT,
      FOREIGN KEY(communityId) REFERENCES communities(id) ON DELETE CASCADE
    )
  `);
}

export default db;
