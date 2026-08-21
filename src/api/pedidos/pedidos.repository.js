// Acceso a datos de pedidos: aísla las llamadas a Sequelize para que
// pedidos.service.js concentre únicamente lógica de negocio.
const { Pedido, Usuario } = require('../../models');

exports.findAndCountAll = ({ where, pagination }) =>
  Pedido.findAndCountAll({
    where,
    include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido', 'email', 'telefono'] }],
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });

exports.create = (data, opts) => Pedido.create(data, opts);

exports.findByIdConUsuario = (id) =>
  Pedido.findByPk(id, { include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'email'] }] });

exports.findByIdConUsuarioCompleto = (id) =>
  Pedido.findByPk(id, { include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido', 'email', 'telefono'] }] });

exports.findById = (id, opts) => Pedido.findByPk(id, opts);

exports.findAllPorUsuario = (usuarioId) =>
  Pedido.findAll({ where: { usuarioId }, order: [['createdAt', 'DESC']] });
