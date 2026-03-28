// Script de verificación e inicialización de la base de datos
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'adminfincas.db');

try {
  const db = new Database(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  db.close();

  if (tables.length === 0) {
    console.log('DB_EMPTY');
    process.exit(1); // exit 1 = hay que hacer push
  } else {
    console.log('DB_OK (' + tables.length + ' tablas)');
    process.exit(0); // exit 0 = todo ok
  }
} catch (e) {
  console.log('DB_ERROR: ' + e.message);
  process.exit(1);
}
