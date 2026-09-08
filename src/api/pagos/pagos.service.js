// Lógica de negocio y acceso a datos de pagos. No conoce Express.
const { Pedido, sequelize } = require('../../models');
const repository = require('./pagos.repository');
const AppError = require('../../utils/AppError');

const esAdmin = (rol) => rol === 'ADMIN' || rol === 'ADMINISTRADOR';

// Un pago representa dinero real ya recibido: solo quien lo registró o un
// ADMIN puede corregirlo/eliminarlo después (a diferencia de Pedido/
// Domicilio, que varios trabajadores por turno necesitan poder seguir
// gestionando sin importar quién los tocó primero). Un pago sin
// registradoPorDocumento (creado antes de esta migración) solo lo puede
// tocar un ADMIN, porque no hay forma de saber quién lo registró.
const verificarPuedeModificarPago = (pago, requester) => {
  if (!requester) return;
  if (esAdmin(requester.rol)) return;
  if (pago.registradoPorDocumento && pago.registradoPorDocumento === requester.documento) return;
  throw new AppError('Solo quien registró este pago o un administrador puede modificarlo', 403);
};

// Recalcula el total pagado de un pedido a partir de sus pagos "aplicado"/
// "pendiente", y lo convierte a venta si ya quedó completamente pagado y
// entregado. Se exporta porque pedidos.service y domicilios.service también
// necesitan invocarlo (antes se hacía con un require() perezoso al
// controlador de pagos; ahora es una dependencia explícita entre services).
exports.actualizarTotalPagado = async (pedidoId, trans = null) => {
  try {
    const pedido = await Pedido.findByPk(pedidoId, { transaction: trans });
    if (!pedido) return 0;

    const pagosRelevantes = await repository.findRelevantesPorPedido(pedidoId, { transaction: trans });
    const total = pagosRelevantes.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    await pedido.update({ totalPagado: total }, { transaction: trans });

    if (pedido.estadoPedido === 'entregado' && total >= parseFloat(pedido.total) && !pedido.esVenta) {
      await pedido.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: trans });
    }

    return total;
  } catch (error) {
    console.error('Error en actualizarTotalPagado:', error.message);
    return 0;
  }
};

// Después de que un pago pasa a "aplicado" (fuera de la transacción, para
// ver todos los pagos ya confirmados), si el pedido por abono ya quedó
// pagado en su totalidad y entregado/recibido, se convierte a venta. La
// misma comprobación se disparaba 3 veces (crear/actualizar/cambiarEstado)
// con el mismo cuerpo exacto — se deja como una sola función aquí.
const intentarConvertirAVenta = async (pedidoId) => {
  const pedido = await Pedido.findByPk(pedidoId);
  if (!pedido || pedido.esVenta || pedido.metodoPago !== 'Abono') return;

  const pagosRelevantes = await repository.findRelevantesPorPedido(pedidoId);
  const totalPagado = pagosRelevantes.reduce((sum, p) => sum + parseFloat(p.monto), 0);
  const estadoValido = ['entregado', 'recibido'].includes(String(pedido.estadoPedido).toLowerCase());

  if (estadoValido && totalPagado >= parseFloat(pedido.total)) {
    await pedido.update({ esVenta: true, estadoVenta: 'completada' });
  }
};

exports.listar = async ({ isStaff, documento, pedido, estado, metodo, pagination }) => {
  const where = {};
  if (pedido) where.pedidoId = pedido;
  if (estado) where.estado = estado;
  if (metodo) where.metodo = metodo;

  if (!isStaff) {
    const pedidosCliente = await Pedido.findAll({ where: { usuarioId: documento } });
    where.pedidoId = pedidosCliente.map(p => p.id);
  }

  return repository.findAndCountAll({ where, pagination });
};

exports.crear = async (data, requester) => {
  const { pedidoId, monto, metodo, estado, referencia, notas, tipo } = data;
  const t = await sequelize.transaction();

  try {
    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (pedido.metodoPago !== 'Abono') throw new AppError('Solo se pueden registrar pagos para pedidos con método Abono', 400);

    const estadoInvalido = ['rechazado', 'cancelado', 'anulado'].includes(String(pedido.estadoPedido || '').toLowerCase());
    if (estadoInvalido) throw new AppError(`No se puede registrar pago. El pedido está ${pedido.estadoPedido}.`, 400);

    const validDeliveryStates = ['pendiente', 'aprobado', 'en_preparacion', 'asignado', 'en_camino', 'entregado'];
    const currentState = String(pedido.estadoPedido || '').toLowerCase();
    if (pedido.tipoVenta === 'domicilio' && !validDeliveryStates.includes(currentState)) {
      throw new AppError(`No se puede registrar pago. El pedido de domicilio debe tener un repartidor asignado (actual: ${currentState}).`, 400);
    }

    const nuevoPago = await repository.create({
      pedidoId, monto, metodo,
      estado: estado || 'Pendiente',
      referencia, notas,
      tipo: tipo || 'pago_total',
      registradoPorDocumento: requester?.documento || null,
      registradoPorNombre: requester?.nombre || null,
    }, { transaction: t });

    if (nuevoPago.estado === 'aplicado') {
      await exports.actualizarTotalPagado(nuevoPago.pedidoId, t);
    }

    await t.commit();

    if (nuevoPago.estado === 'aplicado') {
      await intentarConvertirAVenta(nuevoPago.pedidoId);
    }

    return repository.findByIdConPedido(nuevoPago.id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.obtenerPorId = async (id) => {
  const pago = await repository.findByIdConPedidoUsuario(id);
  if (!pago) throw new AppError('Pago no encontrado', 404);
  return pago;
};

exports.actualizar = async (id, data, requester) => {
  const { monto, metodo, estado, referencia, notas, tipo } = data;
  const t = await sequelize.transaction();

  try {
    const pago = await repository.findById(id, { transaction: t });
    if (!pago) throw new AppError('Pago no encontrado', 404);
    verificarPuedeModificarPago(pago, requester);

    const oldEstado = pago.estado;
    await pago.update({
      monto: monto !== undefined ? monto : pago.monto,
      metodo: metodo !== undefined ? metodo : pago.metodo,
      estado: estado !== undefined ? estado : pago.estado,
      referencia: referencia !== undefined ? referencia : pago.referencia,
      notas: notas !== undefined ? notas : pago.notas,
      tipo: tipo !== undefined ? tipo : pago.tipo
    }, { transaction: t });

    const pasoAAplicado = oldEstado !== 'aplicado' && estado === 'aplicado';
    const dejoDeAplicar = oldEstado === 'aplicado' && estado !== 'aplicado';
    if (pasoAAplicado || dejoDeAplicar) {
      await exports.actualizarTotalPagado(pago.pedidoId, t);
    }

    await t.commit();

    if (pasoAAplicado) {
      await intentarConvertirAVenta(pago.pedidoId);
    }

    return repository.findByIdConPedido(id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.cambiarEstado = async (id, estado, requester) => {
  const t = await sequelize.transaction();

  try {
    const pago = await repository.findById(id, { transaction: t });
    if (!pago) throw new AppError('Pago no encontrado', 404);
    verificarPuedeModificarPago(pago, requester);

    const oldEstado = pago.estado;
    await pago.update({ estado }, { transaction: t });

    const pasoAAplicado = oldEstado !== 'aplicado' && estado === 'aplicado';
    const dejoDeAplicar = oldEstado === 'aplicado' && estado !== 'aplicado';
    if (pasoAAplicado || dejoDeAplicar) {
      await exports.actualizarTotalPagado(pago.pedidoId, t);
    }

    await t.commit();

    if (pasoAAplicado) {
      await intentarConvertirAVenta(pago.pedidoId);
    }

    return pago;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.misPagos = async (documento) => {
  const pedidos = await Pedido.findAll({ where: { usuarioId: documento } });
  const pedidosIds = pedidos.map(p => p.id);

  return repository.findByPedidoIds(pedidosIds);
};

exports.eliminar = async (id, requester) => {
  const pago = await repository.findById(id);
  if (!pago) throw new AppError('Pago no encontrado', 404);
  verificarPuedeModificarPago(pago, requester);
  await pago.destroy();
};
