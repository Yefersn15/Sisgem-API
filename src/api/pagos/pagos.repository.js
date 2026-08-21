// Acceso a datos de pagos: aísla las llamadas a Sequelize para que
// pagos.service.js concentre únicamente lógica de negocio.
const { Op } = require('sequelize');
const { Pago, Pedido, Usuario } = require('../../models');

exports.findAndCountAll = ({ where, pagination }) =>
  Pago.findAndCountAll({
    where,
    include: [{ model: Pedido, as: 'pedido', include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido'] }] }],
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });

exports.create = (data, opts) => Pago.create(data, opts);

exports.findByIdConPedido = (id, opts) =>
  Pago.findByPk(id, { include: [{ model: Pedido, as: 'pedido' }], ...opts });

exports.findByIdConPedidoUsuario = (id) =>
  Pago.findByPk(id, {
    include: [{ model: Pedido, as: 'pedido', include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido', 'email', 'telefono'] }] }]
  });

exports.findById = (id, opts) => Pago.findByPk(id, opts);

exports.findByPedidoIds = (pedidoIds) =>
  Pago.findAll({
    where: { pedidoId: pedidoIds },
    include: [{ model: Pedido, as: 'pedido' }],
    order: [['createdAt', 'DESC']]
  });

exports.findRelevantesPorPedido = (pedidoId, opts) =>
  Pago.findAll({
    where: { pedidoId, estado: { [Op.in]: ['aplicado', 'pendiente'] } },
    ...opts
  });
