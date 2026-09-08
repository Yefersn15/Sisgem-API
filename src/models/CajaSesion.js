const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// El nombre de quien abre/cierra se guarda como snapshot (abiertoPorNombre/
// cerradoPorNombre) en lugar de resolverse con un join a Usuario, igual que
// domicilios.repartidor: así el historial de un cierre no cambia si esa
// persona después edita su nombre o se le borra la cuenta.
const CajaSesion = sequelize.define('CajaSesion', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  abiertoPorDocumento: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'abierto_por_documento'
  },
  abiertoPorNombre: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'abierto_por_nombre'
  },
  cerradoPorDocumento: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'cerrado_por_documento'
  },
  cerradoPorNombre: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'cerrado_por_nombre'
  },
  montoInicial: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'monto_inicial'
  },
  montoContado: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'monto_contado'
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'abierta'
  },
  fechaCierre: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_cierre'
  },
  notasApertura: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'notas_apertura'
  },
  notasCierre: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'notas_cierre'
  },
  // Snapshot del cálculo de cierre (desglose por método, domicilios
  // entregados, efectivo esperado, diferencia): se congela en el momento del
  // cierre para que el historial no cambie si luego se edita/anula un pedido
  // o pago de ese turno.
  resumenCierre: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'resumen_cierre'
  }
}, {
  tableName: 'caja_sesiones',
  timestamps: true
});

module.exports = CajaSesion;
