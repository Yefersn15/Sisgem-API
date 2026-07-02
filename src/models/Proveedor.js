const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Proveedor = sequelize.define('Proveedor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  ciudad: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  logo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logoData: {
    type: DataTypes.BLOB,
    allowNull: true
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'proveedores',
  timestamps: true
});

module.exports = Proveedor;