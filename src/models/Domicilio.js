const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Domicilio = sequelize.define('Domicilio', {
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
  repartidorId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'repartidor_id'
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  direccion2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  barrio: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ciudad: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  estado: {
    type: DataTypes.STRING(50),
    defaultValue: 'Pendiente'
  },
  costo: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  tarifaAplicada: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'tarifa_aplicada'
  },
  repartidor: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  fechaAsignacion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_asignacion'
  },
  datosFront: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'datos_front'
  }
}, {
  tableName: 'domicilios',
  timestamps: true
});

module.exports = Domicilio;