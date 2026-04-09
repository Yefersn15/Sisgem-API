const sequelize = require('../config/database');
const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Proveedor = require('./Proveedor');
const Categoria = require('./Categoria');
const Marca = require('./Marca');
const Producto = require('./Producto');
const Pedido = require('./Pedido');
const Pago = require('./Pago');
const Domicilio = require('./Domicilio');
const OrdenCompra = require('./OrdenCompra');
const Banner = require('./Banner');

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Proveedor,
  Categoria,
  Marca,
  Producto,
  Pedido,
  Pago,
  Domicilio,
  OrdenCompra,
  Banner
};
