// Acceso a datos de marcas: aísla las llamadas a Sequelize para que
// marcas.service.js concentre únicamente lógica de negocio.
const { Marca } = require('../../models');

exports.findAndCountAll = ({ where, pagination }) =>
  Marca.findAndCountAll({
    where,
    order: [['nombre', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset,
  });

exports.findByNombre = (nombre) => Marca.findOne({ where: { nombre } });

exports.create = (data) => Marca.create(data);

exports.findById = (id) => Marca.findByPk(id);

exports.findAllOrdenadas = () => Marca.findAll({ order: [['nombre', 'ASC']] });
