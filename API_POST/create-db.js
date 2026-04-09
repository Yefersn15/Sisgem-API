const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: 'postgres',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

async function createDB() {
  try {
    await pool.query('CREATE DATABASE "Sisgem-API"');
    console.log('✅ Base de datos creada');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('ℹ️ La base de datos ya existe');
    } else {
      console.error('❌ Error:', err.message);
    }
  } finally {
    await pool.end();
  }
}

createDB();