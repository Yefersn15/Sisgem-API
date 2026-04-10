const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrdenCompra = sequelize.define('OrdenCompra', {
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
  usuarioId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'usuario_id'
  },
  estado: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pendiente'
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  impuesto: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  productos: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'ordenes_compra',
  timestamps: true
});

module.exports = OrdenCompra;