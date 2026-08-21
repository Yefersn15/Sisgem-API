// Acceso a datos de domicilios: aísla las llamadas a Sequelize sobre el
// modelo Domicilio para que domicilios.service.js concentre únicamente
// lógica de negocio. Las consultas sobre Pedido/Pago/Usuario/Producto que
// ese service también necesita (por la naturaleza transaccional y
// multi-modelo del dominio "domicilio") permanecen allí.
const { Domicilio, Pedido, Usuario } = require('../../models');

const PEDIDO_RESUMEN_ATTRS = ['id', 'total', 'estadoPedido', 'direccion', 'metodoPago', 'telefono_contacto'];

exports.findAndCountAll = ({ where, pagination }) =>
  Domicilio.findAndCountAll({
    where,
    include: [{ model: Pedido, as: 'pedido', attributes: PEDIDO_RESUMEN_ATTRS }],
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
    distinct: true,
  });

exports.create = (data, opts) => Domicilio.create(data, opts);

exports.findByIdConPedido = (id, opts) =>
  Domicilio.findByPk(id, { include: [{ model: Pedido, as: 'pedido' }], ...opts });

exports.findById = (id, opts) => Domicilio.findByPk(id, opts);

exports.findByPedidoId = (pedidoId, opts) => Domicilio.findOne({ where: { pedidoId }, ...opts });

exports.updateById = (id, data, opts) => Domicilio.update(data, { where: { id }, ...opts });

exports.findAllPorPedidos = (pedidoIds) =>
  Domicilio.findAll({ where: { pedidoId: pedidoIds }, include: [{ model: Pedido, as: 'pedido' }] });

exports.findAllPorPedidosConUsuario = (pedidoIds) =>
  Domicilio.findAll({
    where: { pedidoId: pedidoIds },
    include: [{ model: Pedido, include: [{ model: Usuario, attributes: ['nombre', 'documento', 'email', 'telefono'] }] }],
    order: [['createdAt', 'DESC']]
  });

exports.findAllPorRepartidor = (repartidorId) =>
  Domicilio.findAll({
    where: { repartidorId },
    include: [{ model: Pedido, include: [{ model: Usuario, attributes: ['nombre', 'documento', 'email', 'telefono'] }] }],
    order: [['createdAt', 'DESC']]
  });
