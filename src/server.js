require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = require('./app');

const PORT = process.env.PORT || 3000;

async function ensureAdminUser() {
  try {
    const { Rol, Usuario } = require('./models');

    const [rol] = await Rol.findOrCreate({
      where: { nombre: 'ADMIN' },
      defaults: {
        nombre: 'ADMIN',
        descripcion: 'Administrador del sistema con acceso total',
        permisos: [
          'ventas.read', 'ventas.write', 'ventas.delete',
          'pedidos.read', 'pedidos.write', 'pedidos.delete',
          'pagos.read', 'pagos.write', 'pagos.delete',
          'domicilios.read', 'domicilios.write', 'domicilios.delete',
          'productos.read', 'productos.write', 'productos.delete',
          'categorias.read', 'categorias.write', 'categorias.delete',
          'marcas.read', 'marcas.write', 'marcas.delete',
          'proveedores.read', 'proveedores.write', 'proveedores.delete',
          'usuarios.read', 'usuarios.write', 'usuarios.delete',
          'roles.read', 'roles.write', 'roles.delete',
          'config.read', 'config.write',
          'reportes.read'
        ],
        esDefault: false,
        estado: true
      }
    });

    const [usuario, created] = await Usuario.findOrCreate({
      where: { email: 'admin@sisgem.com' },
      defaults: {
        documento: '1000000000',
        tipoDocumento: 'CC',
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@sisgem.com',
        password: 'Admin123!',
        telefono: '3000000000',
        genero: 'Otro',
        direccion: 'Sede principal',
        barrio: 'Principal',
        estado: true,
        rolId: rol.id
      }
    });

    if (!created) {
      await usuario.update({
        rolId: rol.id,
        estado: true,
        password: 'Admin123!'
      });
    }

    console.log(created ? '✅ Usuario administrador creado' : 'ℹ️ Usuario administrador ya existe');
  } catch (error) {
    console.warn('⚠️ No se pudo asegurar el usuario administrador:', error.message);
  }
}

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

    await ensureAdminUser();
  } catch (error) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL:', error.message);
    console.log('⚠️ El servidor continuará arrancando aunque la base de datos no esté disponible');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

startServer();