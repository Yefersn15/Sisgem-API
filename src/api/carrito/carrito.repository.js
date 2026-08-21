// Acceso a datos del carrito: el carrito en sí vive en memoria, pero
// consultar el producto asociado a cada ítem sí pasa por Sequelize.
const { Producto } = require('../../models');

exports.findProductoById = (id) => Producto.findByPk(id);
