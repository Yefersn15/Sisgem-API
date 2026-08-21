// Se ejecuta una sola vez, antes de todos los archivos de test, en un
// proceso aparte. Crea la base de datos de pruebas si todavía no existe
// (las tablas las crea cada archivo de test con sequelize.sync).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });
const { Client } = require('pg');

module.exports = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'jest.config.js no cargó .env.test correctamente (NODE_ENV !== "test"). ' +
      'Verifica que Sisgem-API/.env.test exista (copia .env.test.example).'
    );
  }

  const dbName = process.env.DB_NAME;
  if (!dbName || !dbName.toUpperCase().includes('TEST')) {
    // Salvaguarda: nunca correr los tests (que hacen DROP/CREATE de tablas)
    // contra una base de datos que no sea explícitamente de test.
    throw new Error(
      `DB_NAME="${dbName}" no parece una base de datos de test (debe contener "TEST"). Abortando por seguridad.`
    );
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  await client.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`\n[tests] Base de datos de prueba "${dbName}" creada.`);
    }
  } finally {
    await client.end();
  }
};
