// Acceso a datos de roles: aísla las llamadas a Sequelize para que
// roles.service.js concentre únicamente lógica de negocio.
const { Rol } = require('../../models');

exports.findAll = () => Rol.findAll();

exports.create = (data) => Rol.create(data);

exports.findAndCountAll = ({ where, pagination }) =>
  Rol.findAndCountAll({
    where,
    order: [['nombre', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset,
  });

exports.findByNombre = (nombre) => Rol.findOne({ where: { nombre } });

exports.findById = (id) => Rol.findByPk(id);
