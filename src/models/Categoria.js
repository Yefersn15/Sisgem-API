const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Categoria = sequelize.define('Categoria', {
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
  tableName: 'categorias',
  timestamps: true
});

module.exports = Categoria;