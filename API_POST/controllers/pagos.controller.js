const { Pago, Pedido, Usuario, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

async function actualizarTotalPagado(pedidoId) {
  const pedido = await Pedido.findByPk(pedidoId);
  if (!pedido) return 0;
  
  const pagosAplicados = await Pago.findAll({ 
    where: { pedidoId, estado: 'aplicado' }
  });
  const total = pagosAplicados.reduce((sum, p) => sum + parseFloat(p.monto), 0);
  await pedido.update({ totalPagado: total });
  return total;
}

exports.listar = async (req, res) => {
  try {
    const { pedido, estado, metodo } = req.query;
    const where = {};
    if (pedido) where.pedidoId = pedido;
    if (estado) where.estado = estado;
    if (metodo) where.metodo = metodo;

    const isStaff = req.user && ['ADMIN', 'EMPLEADO'].includes(req.user.rol);
    if (!isStaff) {
      const pedidosCliente = await Pedido.findAll({ where: { usuarioId: req.user.documento } });
      const pedidosIds = pedidosCliente.map(p => p.id);
      where.pedidoId = pedidosIds;
    }

    const pagos = await Pago.findAll({
      where,
      include: [{ model: Pedido, include: [{ model: Usuario, attributes: ['nombre'] }] }],
      order: [['createdAt', 'DESC']]
    });
    return successResponse(res, pagos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { pedidoId, monto, metodo, estado, referencia, notas, tipo } = req.body;

    const nuevoPago = await Pago.create({
      pedidoId,
      monto,
      metodo,
      estado: estado || 'Pendiente',
      referencia,
      notas,
      tipo: tipo || 'pago_total'
    }, { transaction: t });

    if (nuevoPago.estado === 'aplicado') {
      await actualizarTotalPagado(nuevoPago.pedidoId, { transaction: t });
      
      const pedido = await Pedido.findByPk(nuevoPago.pedidoId, { transaction: t });
      if (pedido && pedido.metodoPago === 'Abono' && !pedido.esVenta) {
        if (pedido.totalPagado >= pedido.total) {
          await pedido.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: t });
        }
      }
    }

    await t.commit();

    const pagoPopulado = await Pago.findByPk(nuevoPago.id, {
      include: [{ model: Pedido }]
    });

    return successResponse(res, pagoPopulado, 'Pago registrado', 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await Pago.findByPk(id, {
      include: [{ model: Pedido }]
    });

    if (!pago) return errorResponse(res, 'Pago no encontrado', 404);

    return successResponse(res, pago);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { monto, metodo, estado, referencia, notas, tipo } = req.body;

    const pago = await Pago.findByPk(id, { transaction: t });
    if (!pago) {
      await t.rollback();
      return errorResponse(res, 'Pago no encontrado', 404);
    }

    const oldEstado = pago.estado;
    await pago.update({
      monto: monto !== undefined ? monto : pago.monto,
      metodo: metodo !== undefined ? metodo : pago.metodo,
      estado: estado !== undefined ? estado : pago.estado,
      referencia: referencia !== undefined ? referencia : pago.referencia,
      notas: notas !== undefined ? notas : pago.notas,
      tipo: tipo !== undefined ? tipo : pago.tipo
    }, { transaction: t });

    if (oldEstado !== 'aplicado' && estado === 'aplicado') {
      await actualizarTotalPagado(pago.pedidoId, { transaction: t });
      const pedido = await Pedido.findByPk(pago.pedidoId, { transaction: t });
      if (pedido && pedido.metodoPago === 'Abono' && !pedido.esVenta) {
        if (pedido.totalPagado >= pedido.total) {
          await pedido.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: t });
        }
      }
    } else if (oldEstado === 'aplicado' && estado !== 'aplicado') {
      await actualizarTotalPagado(pago.pedidoId, { transaction: t });
    }

    await t.commit();

    const actualizado = await Pago.findByPk(id, {
      include: [{ model: Pedido }]
    });

    return successResponse(res, actualizado, 'Pago actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const pago = await Pago.findByPk(id, { transaction: t });
    if (!pago) {
      await t.rollback();
      return errorResponse(res, 'Pago no encontrado', 404);
    }

    const oldEstado = pago.estado;
    await pago.update({ estado }, { transaction: t });

    if (oldEstado !== 'aplicado' && estado === 'aplicado') {
      await actualizarTotalPagado(pago.pedidoId, { transaction: t });
    } else if (oldEstado === 'aplicado' && estado !== 'aplicado') {
      await actualizarTotalPagado(pago.pedidoId, { transaction: t });
    }

    await t.commit();

    return successResponse(res, pago, 'Estado actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.misPagos = async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({ where: { usuarioId: req.user.documento } });
    const pedidosIds = pedidos.map(p => p.id);

    const pagos = await Pago.findAll({
      where: { pedidoId: pedidosIds },
      include: [{ model: Pedido }],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, pagos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const pago = await Pago.findByPk(id);
    if (!pago) return errorResponse(res, 'Pago no encontrado', 404);

    await pago.destroy();

    return successResponse(res, null, 'Pago eliminado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};