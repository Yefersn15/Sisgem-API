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
    defaultValue: 0,
    field: 'stock_minimo'
  },
  imagen: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'imagen'
  },
  imagenData: {
    type: DataTypes.BLOB,
    allowNull: true,
    field: 'imagen_data'
  },
  codigoBarras: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'codigo_barras'
  },
  precioCompra: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'precio_compra'
  },
  categoriaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'categoria_id'
  },
  marcaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'marca_id'
  },
  proveedorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'proveedor_id'
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