const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pago = sequelize.define('Pago', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pedidoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'pedido_id'
  },
  monto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  metodo: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  referencia: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pendiente'
  },
  fechaPago: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_pago'
  },
  tipo: {
    type: DataTypes.STRING(20),
    defaultValue: 'pago_total'
  },
  comprobante: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pagos',
  timestamps: true
});

module.exports = Pago;