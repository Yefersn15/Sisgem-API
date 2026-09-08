const sequelize = require('../config/database');
const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Marca = require('./Marca');
const Producto = require('./Producto');
const Pedido = require('./Pedido');
const Pago = require('./Pago');
const Domicilio = require('./Domicilio');
const Banner = require('./Banner');
const Configuracion = require('./Configuracion');
const CajaSesion = require('./CajaSesion');

Categoria.hasMany(Producto, { foreignKey: 'categoriaId', as: 'productos' });
Producto.belongsTo(Categoria, { foreignKey: 'categoriaId', as: 'categoria' });

Marca.hasMany(Producto, { foreignKey: 'marcaId', as: 'productos' });
Producto.belongsTo(Marca, { foreignKey: 'marcaId', as: 'marca' });

Rol.hasMany(Usuario, { foreignKey: 'rolId', as: 'usuarios' });
Usuario.belongsTo(Rol, { foreignKey: 'rolId', as: 'rol' });

Usuario.hasMany(Pedido, { foreignKey: 'usuarioId', as: 'pedidos' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuarioId', as: 'usuario' });

Pedido.hasMany(Pago, { foreignKey: 'pedidoId', as: 'pagos' });
Pago.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });

Pedido.hasOne(Domicilio, { foreignKey: 'pedidoId', as: 'domicilio' });
Domicilio.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Categoria,
  Marca,
  Producto,
  Pedido,
  Pago,
  Domicilio,
  Banner,
  Configuracion,
  CajaSesion
};
