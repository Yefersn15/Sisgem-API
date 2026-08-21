// Acceso a datos de autenticación: aísla las llamadas a Sequelize (Usuario,
// Rol) para que auth.service.js concentre únicamente lógica de negocio.
const { Op } = require('sequelize');
const { Usuario, Rol } = require('../../models');

exports.findUsuarioByEmail = (email) => Usuario.findOne({ where: { email } });

exports.findUsuarioById = (documento) => Usuario.findByPk(documento);

exports.findUsuarioByEmailConRol = (email) =>
  Usuario.findOne({ where: { email }, include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }] });

exports.findUsuarioByDocumentoConRol = (documento) =>
  Usuario.findOne({ where: { documento }, include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }] });

exports.findUsuarioByIdConRol = (documento) =>
  Usuario.findByPk(documento, { include: [{ model: Rol, as: 'rol' }] });

exports.crearUsuario = (data) => Usuario.create(data);

exports.findRolActivoPorNombre = (nombre) => Rol.findOne({ where: { nombre, estado: true } });

exports.findRolActivoPorNombres = (nombres) =>
  Rol.findOne({ where: { nombre: { [Op.in]: nombres }, estado: true } });

exports.crearRol = (data) => Rol.create(data);
