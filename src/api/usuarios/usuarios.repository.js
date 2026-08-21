// Acceso a datos de usuarios: aísla las llamadas a Sequelize para que
// usuarios.service.js concentre únicamente lógica de negocio.
const { Usuario, Rol } = require('../../models');

const includeRol = [{ model: Rol, attributes: ['id', 'nombre'], as: 'rol' }];
const sinPassword = { exclude: ['password'] };

exports.findAndCountAll = ({ where, pagination }) =>
  Usuario.findAndCountAll({
    where,
    include: includeRol,
    attributes: sinPassword,
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });

exports.findByEmail = (email) => Usuario.findOne({ where: { email } });

exports.findById = (documento) => Usuario.findByPk(documento);

exports.create = (data) => Usuario.create(data);

exports.findByIdConRolSinPassword = (documento) =>
  Usuario.findByPk(documento, { include: includeRol, attributes: sinPassword });

exports.findByDocumentoConRolSinPassword = (documento) =>
  Usuario.findOne({ where: { documento }, include: includeRol, attributes: sinPassword });

exports.findByIdConRolNombreSinPassword = (id) =>
  Usuario.findByPk(id, { include: [{ model: Rol, attributes: ['nombre'] }], attributes: sinPassword });

exports.findByIdSoloDirecciones = (documento) =>
  Usuario.findByPk(documento, { attributes: ['direcciones'] });
