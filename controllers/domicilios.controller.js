const { Domicilio, Pedido, Pago, Usuario, Producto, sequelize, Op } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.listar = async (req, res) => {
  try {
    const { estado, pedido } = req.query;
    const where = {};
    if (estado) where.estado = estado;
    if (pedido) where.pedidoId = pedido;
    
    const domicilios = await Domicilio.findAll({
      where,
      include: [
        { model: Pedido, as: 'pedido', attributes: ['id', 'total', 'estadoPedido', 'direccion', 'metodoPago', 'telefono_contacto'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return successResponse(res, domicilios);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { pedidoId, direccion, tarifa, repartidor, telefono_repartidor, ciudad, barrio, telefono } = req.body;
    
    const pedidoData = await Pedido.findByPk(pedidoId, { transaction: t });
    if (!pedidoData) {
      await t.rollback();
      return errorResponse(res, 'Pedido no encontrado', 404);
    }
    if (pedidoData.tipoVenta !== 'domicilio') {
      await t.rollback();
      return errorResponse(res, 'El pedido no es de tipo domicilio', 400);
    }

    let repartidorData = null;
    if (repartidor && typeof repartidor === 'object') {
      repartidorData = {
        nombre: repartidor.nombre || '',
        telefono: repartidor.telefono || '',
        tipoVehiculo: repartidor.tipoVehiculo || '',
        placa: repartidor.placa || ''
      };
    } else if (repartidor && typeof repartidor === 'string') {
      repartidorData = { nombre: repartidor, telefono: telefono_repartidor || '', tipoVehiculo: '', placa: '' };
    }

    let direccionData = direccion;
    if (typeof direccion === 'string') {
      direccionData = { direccion, barrio: barrio || '', telefono: telefono || '' };
    } else if (direccion && typeof direccion === 'object') {
      direccionData = {
        direccion: direccion.direccion || direccion.direccion || '',
        direccion2: direccion.direccion2 || direccion.apartamento || '',
        barrio: direccion.barrio || barrio || '',
        telefono: direccion.telefono || telefono || '',
        ciudad: ciudad || ''
      };
    }

    let tarifaAplicada = 0;
    if (tarifa !== undefined && tarifa !== null) {
      const num = Number(String(tarifa).replace(/[^0-9.\-]/g, ''));
      tarifaAplicada = isNaN(num) ? 0 : num;
    }

    const nuevoDomicilio = await Domicilio.create({
      pedidoId,
      direccion: typeof direccionData === 'string' ? direccionData : JSON.stringify(direccionData),
      ciudad: ciudad || '',
      barrio: barrio || '',
      telefono: telefono || '',
      costo: tarifaAplicada,
      tarifaAplicada: tarifaAplicada,
      repartidor: repartidorData || null,
      repartidorId: repartidor?.id || null,
      estado: repartidorData && repartidorData.nombre ? 'asignado' : 'Pendiente'
    }, { transaction: t });

    const nuevoTotal = parseFloat(pedidoData.total) + tarifaAplicada;
    const nuevoEstado = (repartidorData && repartidorData.nombre) ? 'asignado' : 'Pendiente';
    
    await Pedido.update({
      total: nuevoTotal,
      estadoPedido: nuevoEstado
    }, { where: { id: pedidoId }, transaction: t });

    await t.commit();
    
    const domicilioPopulado = await Domicilio.findByPk(nuevoDomicilio.id, {
      include: [{ model: Pedido, as: 'pedido' }]
    });
    
    return successResponse(res, domicilioPopulado, 'Domicilio creado', 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const domicilio = await Domicilio.findByPk(req.params.id, {
      include: [{ model: Pedido, as: 'pedido' }]
    });
    if (!domicilio) return errorResponse(res, 'Domicilio no encontrado', 404);
    return successResponse(res, domicilio);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { estado, tarifa_aplicada, forzar } = req.body;
    const domicilio = await Domicilio.findByPk(req.params.id, { 
      include: [{ model: Pedido, as: 'pedido' }],
      transaction: t 
    });
    if (!domicilio) {
      await t.rollback();
      return errorResponse(res, 'Domicilio no encontrado', 404);
    }

    const pedido = domicilio.pedido;
    
    // Si el domicilio ya está entregado y el pedido no se convirtió, intentar convertir
    if (domicilio.estado === 'entregado' && pedido && !pedido.esVenta && (forzar === true || estado === 'entregado')) {
      // Recalcular total pagado desde los pagos
      const { actualizarTotalPagado } = require('./pagos.controller');
      await actualizarTotalPagado(pedido.id, t);
      
      // Volver a cargar el pedido para tener el totalPagado actualizado
      const pedidoActualizado = await Pedido.findByPk(pedido.id, { transaction: t });
      const saldoPendiente = parseFloat(pedidoActualizado.total) - (parseFloat(pedidoActualizado.totalPagado) || 0);
      
      if (saldoPendiente <= 0) {
        await pedidoActualizado.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: t });
      } else {
        await Pago.create({
          pedidoId: pedido.id,
          monto: saldoPendiente,
          metodo: 'Contraentrega',
          estado: 'aplicado',
          referencia: 'Pago automático al entregar domicilio',
          tipo: 'pago_total'
        }, { transaction: t });
        await actualizarTotalPagado(pedido.id, { transaction: t });
      }
      // Deduct stock upon delivery
      const productos = pedidoActualizado.productos || [];
      for (const item of productos) {
        const producto = await Producto.findByPk(item.producto, { transaction: t });
        if (producto) {
          const nuevoStock = producto.stock - item.cantidad;
          if (nuevoStock < 0) {
            await t.rollback();
            return errorResponse(res, `Stock insuficiente para producto ${producto.nombre}`, 400);
          }
          await producto.update({ stock: nuevoStock }, { transaction: t });
        }
      }
      await t.commit();
      return successResponse(res, domicilio, 'Pedido convertido a venta');
    }

    const transiciones = {
      'Pendiente': ['aprobado', 'cancelado'],
      'aprobado': ['asignado', 'cancelado'],
      'asignado': ['en_camino', 'cancelado'],
      'en_camino': ['entregado'],
      'entregado': [],
      'cancelado': []
    };
    if (!transiciones[domicilio.estado]?.includes(estado)) {
      await t.rollback();
      return errorResponse(res, `No se puede pasar de ${domicilio.estado} a ${estado}`, 400);
    }

    let updateData = { estado };
    if (estado === 'entregado') {
      updateData.fechaAsignacion = new Date();
      const pedido = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
      
      if (pedido && pedido.metodoPago !== 'Abono' && !pedido.esVenta) {
        console.log(`[cambiarEstado] Domicilio entregado - método: ${pedido.metodoPago}, creando pago contraentrega`);
        await Pago.create({
          pedidoId: pedido.id,
          monto: pedido.total,
          metodo: 'Contraentrega',
          estado: 'aplicado',
          referencia: `Pago contraentrega - ${pedido.metodoPago}`,
          tipo: 'pago_total'
        }, { transaction: t });
        await Pedido.update({
          esVenta: true,
          estadoVenta: 'completada',
          estadoPedido: 'entregado',
          totalPagado: pedido.total
        }, { where: { id: pedido.id }, transaction: t });
        console.log(`[cambiarEstado] Pedido ${pedido.id} convertido a venta`);
      } else if (pedido && pedido.metodoPago === 'Abono') {
        if (!pedido.esVenta) {
          const saldoPendiente = parseFloat(pedido.total) - (parseFloat(pedido.totalPagado) || 0);
          if (saldoPendiente > 0) {
            await Pago.create({
              pedidoId: pedido.id,
              monto: saldoPendiente,
              metodo: 'Contraentrega',
              estado: 'aplicado',
              referencia: 'Pago automático al entregar domicilio',
              tipo: 'pago_total'
            }, { transaction: t });
            await pedido.update({
              totalPagado: pedido.total,
              esVenta: true,
              estadoVenta: 'completada',
              estadoPedido: 'entregado'
            }, { transaction: t });
          } else {
            await pedido.update({
              esVenta: true,
              estadoVenta: 'completada',
              estadoPedido: 'entregado'
            }, { transaction: t });
          }
        } else {
          await pedido.update({ estadoPedido: 'entregado' }, { transaction: t });
        }
      } else if (pedido) {
        await pedido.update({ estadoPedido: 'entregado' }, { transaction: t });
      }
    }

    // Deduct stock when delivery is marked as delivered
    if (estado === 'entregado') {
      const productos = pedido.productos || [];
      for (const item of productos) {
        const producto = await Producto.findByPk(item.producto, { transaction: t });
        if (producto) {
          const nuevoStock = producto.stock - item.cantidad;
          if (nuevoStock < 0) {
            await t.rollback();
            return errorResponse(res, `Stock insuficiente para producto ${producto.nombre}`, 400);
          }
          await producto.update({ stock: nuevoStock }, { transaction: t });
        }
      }
    }

    if (tarifa_aplicada !== undefined) {
      const diferencia = tarifa_aplicada - (domicilio.tarifaAplicada || 0);
      if (diferencia !== 0 && pedido) {
        await Pedido.update({
          total: sequelize.literal(`total + ${diferencia}`)
        }, { where: { id: pedido.id }, transaction: t });
      }
      updateData.tarifaAplicada = tarifa_aplicada;
    }

    await Domicilio.update(updateData, { where: { id: req.params.id }, transaction: t });

    await t.commit();
    
    const domicilioActualizado = await Domicilio.findByPk(req.params.id);
    return successResponse(res, domicilioActualizado, 'Estado actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.asignarRepartidor = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { repartidor, repartidorId, tarifa, telefono, tipoVehiculo, placa, nombre } = req.body;
    console.log('[asignarRepartidor] id:', id, 'repartidor:', repartidor);

    let domicilio = await Domicilio.findByPk(id, { transaction: t });
    if (!domicilio) {
      console.log('[asignarRepartidor] No found by pk, trying pedidoId:', id);
      domicilio = await Domicilio.findOne({ where: { pedidoId: id }, transaction: t });
    }
    if (!domicilio) {
      await t.rollback();
      return errorResponse(res, 'Domicilio no encontrado', 404);
    }

    let repartidorObj = { nombre: '', telefono: '', tipoVehiculo: '', placa: '' };
    if (repartidor && typeof repartidor === 'object') {
      repartidorObj = {
        nombre: repartidor.nombre || '',
        telefono: repartidor.telefono || '',
        tipoVehiculo: repartidor.tipoVehiculo || '',
        placa: repartidor.placa || ''
      };
    } else if (repartidor && typeof repartidor === 'string') {
      repartidorObj.nombre = repartidor;
      repartidorObj.telefono = telefono || '';
    } else if (nombre) {
      repartidorObj.nombre = nombre;
      repartidorObj.telefono = telefono || '';
      repartidorObj.tipoVehiculo = tipoVehiculo || '';
      repartidorObj.placa = placa || '';
    }

    if (repartidorId) {
      const user = await Usuario.findByPk(repartidorId, { transaction: t });
      if (user) {
        repartidorObj.nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim();
        repartidorObj.telefono = user.telefono || repartidorObj.telefono;
        repartidorObj.tipoVehiculo = user.tipoVehiculo || repartidorObj.tipoVehiculo;
        repartidorObj.placa = user.placa || repartidorObj.placa;
      }
    }

    console.log('[asignarRepartidor] Checking tarifa:', tarifa, 'type:', typeof tarifa);
    let updateData = {
      repartidor: repartidorObj,
      repartidorId: repartidorId || null,
      fechaAsignacion: new Date()
    };
    if (tarifa !== undefined && tarifa !== null) {
      const parsed = String(tarifa).replace(/[^0-9.-]/g, '');
      const tarifaNum = parseFloat(parsed);
      console.log('[asignarRepartidor] Parsed tarifaNum:', tarifaNum, 'isNaN:', isNaN(tarifaNum));
      if (!isNaN(tarifaNum)) {
        updateData.costo = tarifaNum;
        updateData.tarifaAplicada = tarifaNum;
        console.log('[asignarRepartidor] Added to update:', { costo: tarifaNum, tarifaAplicada: tarifaNum });
        
        const pedido = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
        if (pedido) {
          const nuevoTotal = (parseFloat(pedido.subtotal) || 0) + tarifaNum;
          await pedido.update({ total: nuevoTotal }, { transaction: t });
          console.log('[asignarRepartidor] Updated pedido total:', nuevoTotal);
        }
      }
    }
    console.log('[asignarRepartidor] Full updateData:', JSON.stringify(updateData));
    await Domicilio.update(updateData, { where: { id: domicilio.id }, transaction: t });
    console.log('[asignarRepartidor] Updated domicilio', domicilio.id);

    if (['Pendiente', 'aprobado'].includes(domicilio.estado)) {
      await Domicilio.update({ estado: 'asignado' }, { where: { id: domicilio.id }, transaction: t });
    }

    const pedido = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
    if ( pedido && ['Pendiente', 'aprobado'].includes(pedido.estadoPedido)) {
      await Pedido.update({ estadoPedido: 'asignado' }, { where: { id: domicilio.pedidoId }, transaction: t });
    }

    await t.commit();

    const domicilioActualizado = await Domicilio.findByPk(domicilio.id, {
      include: [{ model: Pedido, as: 'pedido' }]
    });
    console.log('[asignarRepartidor] Response:', JSON.stringify({ id: domicilioActualizado.id, tarifaAplicada: domicilioActualizado.tarifaAplicada, costo: domicilioActualizado.costo }));
    return successResponse(res, domicilioActualizado, 'Repartidor asignado/actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.porCliente = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const usuarioData = await Usuario.findByPk(usuarioId);
    if (!usuarioData) return errorResponse(res, 'Usuario no encontrado', 404);
    
    const pedidos = await Pedido.findAll({ where: { usuarioId, tipoVenta: 'domicilio' } });
    const pedidosIds = pedidos.map(p => p.id);
    
    const domicilios = await Domicilio.findAll({ 
      where: { pedidoId: pedidosIds },
      include: [{ model: Pedido, as: 'pedido' }]
    });
    
    return successResponse(res, domicilios);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.misDomicilios = async (req, res) => {
  try {
    const usuarioId = req.user.documento;
    
    const domicilios = await Domicilio.findAll({
      where: { repartidorId: usuarioId },
      include: [{
        model: Pedido,
        include: [{ model: Usuario, attributes: ['nombre', 'documento', 'email', 'telefono'] }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    return successResponse(res, domicilios);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.misPedidosDomicilio = async (req, res) => {
  try {
    const usuarioId = req.user.documento;
    
    const pedidos = await Pedido.findAll({ 
      where: { usuarioId, tipoVenta: 'domicilio' },
      order: [['createdAt', 'DESC']]
    });
    
    const pedidosIds = pedidos.map(p => p.id);
    
    const domicilios = await Domicilio.findAll({
      where: { pedidoId: pedidosIds },
      include: [{
        model: Pedido,
        include: [{ model: Usuario, attributes: ['nombre', 'documento', 'email', 'telefono'] }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    return successResponse(res, domicilios);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const body = req.body || {};
    const domicilio = await Domicilio.findByPk(req.params.id, { 
      include: [{ model: Pedido, as: 'pedido' }],
      transaction: t 
    });
    if (!domicilio) {
      await t.rollback();
      return errorResponse(res, 'Domicilio no encontrado', 404);
    }

    if (body.direccion && typeof body.direccion === 'object') {
      body.direccion = JSON.stringify({
        direccion: body.direccion.direccion || '',
        direccion2: body.direccion.direccion2 || body.direccion.apartamento || '',
        barrio: body.direccion.barrio,
        telefono: body.direccion.telefono
      });
    }

    if (body.tarifa !== undefined && body.tarifa !== null) {
      const num = Number(String(body.tarifa).replace(/[^0-9.\-]/g, ''));
      const nueva = isNaN(num) ? 0 : num;
      const diferencia = nueva - (domicilio.tarifaAplicada || 0);
      if (diferencia !== 0 && domicilio.Pedido) {
        await Pedido.update({
          total: sequelize.literal(`total + ${diferencia}`)
        }, { where: { id: domicilio.pedidoId }, transaction: t });
      }
      body.costo = nueva;
      body.tarifaAplicada = nueva;
    }

    if (body.repartidor && typeof body.repartidor === 'object') {
      body.repartidor = {
        nombre: body.repartidor.nombre || '',
        telefono: body.repartidor.telefono || '',
        tipoVehiculo: body.repartidor.tipoVehiculo || '',
        placa: body.repartidor.placa || ''
      };
      body.fechaAsignacion = new Date();
    }

    if (body.observaciones !== undefined) body.notas = body.observaciones;

    delete body.observaciones;
    delete body.direccionData;

    await Domicilio.update(body, { where: { id: req.params.id }, transaction: t });
    
    await t.commit();
    
    const domicilioActualizado = await Domicilio.findByPk(req.params.id, {
      include: [{ model: Pedido, as: 'pedido' }]
    });
    return successResponse(res, domicilioActualizado, 'Domicilio actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.actualizarTarifa = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tarifa } = req.body;
    const domicilio = await Domicilio.findByPk(req.params.id, { transaction: t });
    if (!domicilio) {
      await t.rollback();
      return errorResponse(res, 'Domicilio no encontrado', 404);
    }
    const diferencia = tarifa - domicilio.tarifaAplicada;
    await Pedido.update({
      total: sequelize.literal(`total + ${diferencia}`)
    }, { where: { id: domicilio.pedidoId }, transaction: t });
    
    await Domicilio.update({
      costo: tarifa,
      tarifaAplicada: tarifa
    }, { where: { id: req.params.id }, transaction: t });
    
    await t.commit();
    
    const actualizado = await Domicilio.findByPk(req.params.id);
    return successResponse(res, actualizado, 'Tarifa actualizada');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.listarTarifas = async (req, res) => {
  return successResponse(res, []);
};

exports.crearTarifa = async (req, res) => {
  return errorResponse(res, 'Funcionalidad de tarifas no implementada', 501);
};

exports.actualizarTarifaTemplate = async (req, res) => {
  return errorResponse(res, 'Funcionalidad de tarifas no implementada', 501);
};

exports.eliminarTarifaTemplate = async (req, res) => {
  return errorResponse(res, 'Funcionalidad de tarifas no implementada', 501);
};

exports.cambiarEstadoRepartidor = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { estado } = req.body;
    const { id } = req.params;
    const repartidorId = req.user.documento;

    const domicilio = await Domicilio.findByPk(id, { 
      include: [{ model: Pedido, as: 'pedido' }],
      transaction: t 
    });
    
    if (!domicilio) {
      await t.rollback();
      return errorResponse(res, 'Domicilio no encontrado', 404);
    }

    // Verificar que el repartidor es el asignado a este domicilio
    const domicilioRepartidorId = domicilio.repartidorId;
    if (domicilioRepartidorId !== repartidorId) {
      await t.rollback();
      return errorResponse(res, 'No tienes permiso para modificar este domicilio', 403);
    }

    const transiciones = {
      'Pendiente': ['aprobado', 'cancelado'],
      'aprobado': ['asignado', 'cancelado'],
      'asignado': ['en_camino', 'cancelado'],
      'en_camino': ['entregado'],
      'entregado': [],
      'cancelado': []
    };
    
    if (!transiciones[domicilio.estado]?.includes(estado)) {
      await t.rollback();
      return errorResponse(res, `No se puede pasar de ${domicilio.estado} a ${estado}`, 400);
    }

    let updateData = { estado };
    if (estado === 'entregado') {
      updateData.fechaAsignacion = new Date();
      const pedido = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
      
      if (pedido && pedido.metodoPago !== 'Abono' && !pedido.esVenta) {
        await Pago.create({
          pedidoId: pedido.id,
          monto: pedido.total,
          metodo: 'Contraentrega',
          estado: 'aplicado',
          referencia: `Pago contraentrega - ${pedido.metodoPago}`,
          tipo: 'pago_total'
        }, { transaction: t });
        await Pedido.update({
          esVenta: true,
          estadoVenta: 'completada',
          estadoPedido: 'entregado',
          totalPagado: pedido.total
        }, { where: { id: pedido.id }, transaction: t });
      } else if (pedido && pedido.metodoPago === 'Abono') {
        if (!pedido.esVenta) {
          const saldoPendiente = parseFloat(pedido.total) - (parseFloat(pedido.totalPagado) || 0);
          if (saldoPendiente > 0) {
            await Pago.create({
              pedidoId: pedido.id,
              monto: saldoPendiente,
              metodo: 'Contraentrega',
              estado: 'aplicado',
              referencia: 'Pago automático al entregar domicilio',
              tipo: 'pago_total'
            }, { transaction: t });
            await pedido.update({
              totalPagado: pedido.total,
              esVenta: true,
              estadoVenta: 'completada',
              estadoPedido: 'entregado'
            }, { transaction: t });
          } else {
            await pedido.update({
              esVenta: true,
              estadoVenta: 'completada',
              estadoPedido: 'entregado'
            }, { transaction: t });
          }
        } else {
          await pedido.update({ estadoPedido: 'entregado' }, { transaction: t });
        }
      } else if (pedido) {
        await pedido.update({ estadoPedido: 'entregado' }, { transaction: t });
      }
    }

    // Deduct stock when delivery is marked as delivered
    if (estado === 'entregado') {
      const productos = pedido.productos || [];
      for (const item of productos) {
        const producto = await Producto.findByPk(item.producto, { transaction: t });
        if (producto) {
          const nuevoStock = producto.stock - item.cantidad;
          if (nuevoStock < 0) {
            await t.rollback();
            return errorResponse(res, `Stock insuficiente para producto ${producto.nombre}`, 400);
          }
          await producto.update({ stock: nuevoStock }, { transaction: t });
        }
      }
    }

    await Domicilio.update(updateData, { where: { id }, transaction: t });

    await t.commit();
    
    const domicilioActualizado = await Domicilio.findByPk(id);
    return successResponse(res, domicilioActualizado, 'Estado actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};