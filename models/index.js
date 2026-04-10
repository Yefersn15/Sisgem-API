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

Proveedor.hasMany(Marca, { foreignKey: 'proveedorId', as: 'marcas' });
Marca.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });

Categoria.hasMany(Producto, { foreignKey: 'categoriaId', as: 'productos' });
Producto.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });

Marca.hasMany(Producto, { foreignKey: 'marcaId', as: 'productos' });
Producto.belongsTo(Marca, { foreignKey: 'marcaId', as: 'marca' });

Proveedor.hasMany(Producto, { foreignKey: 'proveedorId', as: 'productos' });
Producto.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });

Rol.hasMany(Usuario, { foreignKey: 'rolId', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'rolId', as: 'rol' });

Usuario.hasMany(Pedido, { foreignKey: 'usuarioId', as: 'pedidos' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

Proveedor.hasMany(Usuario, { foreignKey: 'proveedorId', as: 'usuarios' });
Usuario.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });

Pedido.hasMany(Pago, { foreignKey: 'pedidoId', as: 'pagos' });
Pago.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });

Pedido.hasOne(Domicilio, { foreignKey: 'pedidoId', as: 'domicilio' });
Domicilio.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });

Proveedor.hasMany(OrdenCompra, { foreignKey: 'proveedorId', as: 'ordenes' });
OrdenCompra.belongsTo(Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });

Usuario.hasMany(OrdenCompra, { foreignKey: 'usuarioId', as: 'ordenes' });
OrdenCompra.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

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
