require('dotenv').config();
const { sequelize } = require('./models');

const app = require('./app');

const PORT = process.env.PORT || 3000;

// Variables sin las cuales la API no puede operar de forma segura o
// funcional: mejor fallar rápido y explícito al arrancar que dejar que el
// servidor levante "normal" y el problema recién se note en el primer
// login o consulta a la base de datos.
const REQUIRED_ENV = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

function validarVariablesDeEntorno() {
  const faltantes = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (faltantes.length > 0) {
    console.error(`❌ Faltan variables de entorno obligatorias: ${faltantes.join(', ')}`);
    process.exit(1);
  }
}

// La creación de la base de datos, el sync de tablas y el usuario admin
// inicial NO se hacen aquí: viven en `npm run db:init` y `npm run seed:db`
// (ver scripts/), que se corren una sola vez al configurar el entorno.
async function startServer() {
  validarVariablesDeEntorno();

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');
  } catch (error) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL:', error.message);
    console.log('⚠️ El servidor continuará arrancando aunque la base de datos no esté disponible');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

startServer();