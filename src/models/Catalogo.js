const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Catalogo = sequelize.define('Catalogo', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  proveedorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'proveedor_id'
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  precioSugerido: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'precio_sugerido'
  },
  imagen: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  categoriaNombre: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'categoria_nombre'
  },
  marcaNombre: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'marca_nombre'
  },
  estadoStock: {
    type: DataTypes.STRING(50),
    defaultValue: 'Disponible',
    field: 'estado_stock'
  }
}, {
  tableName: 'catalogo',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at'
});

module.exports = Catalogo;