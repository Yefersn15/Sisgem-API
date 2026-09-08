const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Marca = sequelize.define('Marca', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sitioWeb: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sitio_web'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  creadoPorDocumento: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'creado_por_documento'
  },
  creadoPorNombre: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'creado_por_nombre'
  }
}, {
  tableName: 'marcas',
  timestamps: true
});

module.exports = Marca;