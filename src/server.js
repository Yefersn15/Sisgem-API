require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = require('./app');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida');

    // Intentar sincronizar modelos
    try {
      await sequelize.sync({ alter: true });
      console.log('✅ Tablas sincronizadas correctamente');
    } catch (syncError) {
      console.log('⚠️ Error al sincronizar tablas:', syncError.message);
      console.log('Las tablas pueden necesitar recreate manual');
    }
  } catch (error) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL:', error.message);
    console.log('⚠️ El servidor continuará arrancando aunque la base de datos no esté disponible');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

startServer();