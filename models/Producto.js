const { DataTypes, UUIDV4 } = require('sequelize');
const sequelize = require('../config/database');

const Producto = sequelize.define('Producto', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  precio: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  stockMinimo: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  imagen: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imagenData: {
    type: DataTypes.BLOB,
    allowNull: true
  },
  codigoBarras: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  precioCompra: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  categoriaId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  marcaId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  proveedorId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'productos',
  timestamps: true
});

module.exports = Producto;