const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rol = sequelize.define('Rol', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permisos: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  esDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'es_default'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'roles',
  timestamps: true
});

module.exports = Rol;