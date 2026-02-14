const SqliteAdapter = require('./sqlite-adapter');

let dbInstance = null;

async function initDb() {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();

  if (dbType === 'mssql') {
    const MssqlAdapter = require('./mssql-adapter');
    dbInstance = new MssqlAdapter({
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME || 'SLTrack',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT) || 1433,
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
      windowsAuth: process.env.DB_WINDOWS_AUTH === 'true'
    });
  } else {
    dbInstance = new SqliteAdapter();
  }

  await dbInstance.connect();
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}

module.exports = { initDb, getDb };
