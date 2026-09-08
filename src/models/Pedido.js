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
    allowNull: false,
    field: 'usuario_id'
  },
  telefonoContacto: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'telefono_contacto'
  },
  metodoPago: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'metodo_pago'
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
    defaultValue: 0,
    field: 'total_pagado'
  },
  estadoPedido: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pendiente',
    field: 'estado_pedido'
  },
  estadoVenta: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pendiente',
    field: 'estado_venta'
  },
  esVenta: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'es_venta'
  },
  tipoVenta: {
    type: DataTypes.STRING(20),
    defaultValue: 'mostrador',
    field: 'tipo_venta'
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
  },
  // Solo trazabilidad (quién aprobó/canceló/gestionó por última vez este
  // pedido): un pedido lo procesan distintos trabajadores según el turno, así
  // que a propósito no restringe quién puede seguir gestionándolo.
  ultimaAccionPorDocumento: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'ultima_accion_por_documento'
  },
  ultimaAccionPorNombre: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'ultima_accion_por_nombre'
  }
}, {
  tableName: 'pedidos',
  timestamps: true
});

module.exports = Pedido;