// Acceso a datos de categorías: aísla las llamadas a Sequelize para que
// categorias.service.js concentre únicamente lógica de negocio.
const { Categoria } = require('../../models');

exports.findAndCountAll = ({ where, pagination }) =>
  Categoria.findAndCountAll({
    where,
    order: [['nombre', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset,
  });

exports.findByNombre = (nombre) => Categoria.findOne({ where: { nombre } });

exports.create = (data) => Categoria.create(data);

exports.findById = (id) => Categoria.findByPk(id);

exports.findAllOrdenadas = () => Categoria.findAll({ order: [['nombre', 'ASC']] });
