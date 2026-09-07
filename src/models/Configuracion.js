const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Fila única (singleton, id fijo en 1) con los datos de la tienda que se
// muestran igual a todos los visitantes: nombre, logo, contacto, horario y
// paleta de color. Se edita desde /admin/configuracion (permiso
// config.write) y se lee sin autenticación desde Header/Footer/Home.
const Configuracion = sequelize.define('Configuracion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1
  },
  nombreTienda: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: 'SISGEM',
    field: 'nombre_tienda'
  },
  logoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'logo_url'
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  direccion: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  horario: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // [{ dias: 'Lunes a viernes', desde: '08:00', hasta: '18:00' }, ...]
  },
  tema: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: { colorAcento: '#3b82f6' }
    // Color de acento del sitio (botones, enlaces, bordes de foco); el modo
    // claro/oscuro sigue siendo una preferencia personal por navegador (ver
    // hooks/useModoOscuro.js), no algo que el admin fije para todos.
  },
  mapaEmbedUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mapa_embed_url'
  }
}, {
  tableName: 'configuracion',
  timestamps: true
});

module.exports = Configuracion;
