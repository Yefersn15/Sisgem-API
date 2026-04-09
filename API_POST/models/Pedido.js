const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pedido = sequelize.define('Pedido', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  usuarioId: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  telefonoContacto: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  metodoPago: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  totalPagado: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  estadoPedido: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pendiente'
  },
  estadoVenta: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pendiente'
  },
  esVenta: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  tipoVenta: {
    type: DataTypes.STRING(20),
    defaultValue: 'mostrador'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  direccion: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  productos: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'pedidos',
  timestamps: true
});

module.exports = Pedido;