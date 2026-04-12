const { Pago, Pedido, Producto, Usuario, sequelize, Op } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

async function actualizarTotalPagado(pedidoId, transaction = null) {
  const pedido = await Pedido.findByPk(pedidoId, { transaction });
  if (!pedido) return 0;
  
  const pagosRelevantes = await Pago.findAll({ 
    where: {
      pedidoId,
      estado: { [Op.in]: ['aplicado', 'pendiente'] }
    },
    transaction
  });
  const total = pagosRelevantes.reduce((sum, p) => sum + parseFloat(p.monto), 0);
  await pedido.update({ totalPagado: total }, { transaction });
  
  if (pedido.estadoPedido === 'entregado' && total >= parseFloat(pedido.total) && !pedido.esVenta) {
    await pedido.update({ esVenta: true, estadoVenta: 'completada' }, { transaction });
    console.log(`✅ Pedido ${pedidoId} convertido a venta (pagado + entregado)`);
  }
  
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
      include: [{ model: Pedido, as: 'pedido', include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido'] }] }],
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

    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) {
      await t.rollback();
      return errorResponse(res, 'Pedido no encontrado', 404);
    }
    console.log('[pagos.crear] pedido:', pedido.id, 'tipoVenta:', pedido.tipoVenta, 'estadoPedido:', pedido.estadoPedido, 'metodoPago:', pedido.metodoPago);

    const validDeliveryStates = ['pendiente', 'aprobado', 'en_preparacion', 'asignado', 'en_camino', 'entregado'];
    const currentState = String(pedido.estadoPedido || '').toLowerCase();
    if (pedido.tipoVenta === 'domicilio' && !validDeliveryStates.includes(currentState)) {
      await t.rollback();
      return errorResponse(res, `No se puede registrar pago. El pedido de domicilio debe tener un repartidor asignado (actual: ${currentState}).`, 400);
    }

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
      
      const pedidoActualizado = await Pedido.findByPk(nuevoPago.pedidoId, { transaction: t });
      if (pedidoActualizado.esVenta) {
        console.log(`Pedido ${pedidoActualizado.id} convertido a venta automáticamente`);
      } else if (pedidoActualizado.metodoPago === 'Abono') {
        const pagosRelevantes = await Pago.findAll({ 
          where: { 
            pedidoId: pedidoActualizado.id,
            estado: { [Op.in]: ['aplicado', 'pendiente'] }
          }
        }, { transaction: t });
        const totalPagado = pagosRelevantes.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        
        if (totalPagado >= parseFloat(pedidoActualizado.total)) {
          await pedidoActualizado.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: t });
        }
      }
    }

    await t.commit();

    const pagoPopulado = await Pago.findByPk(nuevoPago.id, {
      include: [{ model: Pedido, as: 'pedido' }]
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
      include: [{ 
        model: Pedido, 
        as: 'pedido',
        include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido', 'email', 'telefono'] }]
      }]
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
      const pedidoActualizado = await Pedido.findByPk(pago.pedidoId, { transaction: t });
      if (pedidoActualizado.esVenta) {
        console.log(`Pedido ${pedidoActualizado.id} convertido a venta automáticamente`);
      } else if (pedidoActualizado.metodoPago === 'Abono') {
        const pagosRelevantes = await Pago.findAll({ 
          where: { 
            pedidoId: pedidoActualizado.id,
            estado: { [Op.in]: ['aplicado', 'pendiente'] }
          }
        }, { transaction: t });
        const totalPagado = pagosRelevantes.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        if (totalPagado >= parseFloat(pedidoActualizado.total)) {
          await pedidoActualizado.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: t });
        }
      }
    } else if (oldEstado === 'aplicado' && estado !== 'aplicado') {
      await actualizarTotalPagado(pago.pedidoId, { transaction: t });
    }

    await t.commit();

    const actualizado = await Pago.findByPk(id, {
      include: [{ model: Pedido, as: 'pedido' }]
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
      const pedidoActualizado = await Pedido.findByPk(pago.pedidoId, { transaction: t });
      if (pedidoActualizado.esVenta) {
        console.log(`Pedido ${pedidoActualizado.id} convertido a venta automáticamente`);
      } else if (pedidoActualizado.metodoPago === 'Abono') {
        const pagosRelevantes = await Pago.findAll({ 
          where: { 
            pedidoId: pedidoActualizado.id,
            estado: { [Op.in]: ['aplicado', 'pendiente'] }
          }
        }, { transaction: t });
        const totalPagado = pagosRelevantes.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        if (totalPagado >= parseFloat(pedidoActualizado.total)) {
          await pedidoActualizado.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: t });
        }
      }
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
      include: [{ model: Pedido, as: 'pedido' }],
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