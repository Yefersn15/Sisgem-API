// Acceso a datos de productos: aísla las llamadas a Sequelize para que
// productos.service.js concentre únicamente lógica de negocio.
const { Op } = require('sequelize');
const { Producto, Categoria, Marca } = require('../../models');

const includeRelaciones = (attrs = ['id', 'nombre']) => [
  { model: Categoria, attributes: attrs, as: 'categoria' },
  { model: Marca, attributes: attrs, as: 'marca' },
];

exports.findAndCountAll = ({ where, pagination }) =>
  Producto.findAndCountAll({
    where,
    include: includeRelaciones(),
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });

exports.create = (data) => Producto.create(data);

exports.findByIdConRelaciones = (id) => Producto.findByPk(id, { include: includeRelaciones(['nombre']) });

exports.findById = (id) => Producto.findByPk(id);

exports.findStockBajo = () =>
  Producto.findAll({
    where: { estado: true, stock: { [Op.lt]: 5 } },
    include: includeRelaciones(['nombre']),
  });

exports.findAllConRelaciones = () => Producto.findAll({ include: includeRelaciones(['nombre']) });
