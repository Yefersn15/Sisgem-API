require('dotenv').config();
const { sequelize } = require('./models');

const app = require('./app');

const PORT = process.env.PORT || 3000;

// La creación de la base de datos, el sync de tablas y el usuario admin
// inicial NO se hacen aquí: viven en `npm run db:init` y `npm run seed:db`
// (ver scripts/), que se corren una sola vez al configurar el entorno.
async function startServer() {
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