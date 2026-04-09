const { Domicilio, Pedido, Usuario, sequelize } = require('../models');
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
        { model: Pedido, attributes: ['total', 'estadoPedido'] }
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
      repartidor: repartidorData ? JSON.stringify(repartidorData) : null,
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
      include: [{ model: Pedido }]
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
      include: [{ model: Pedido }]
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
    const { estado, tarifa_aplicada } = req.body;
    const domicilio = await Domicilio.findByPk(req.params.id, { 
      include: [{ model: Pedido }],
      transaction: t 
    });
    if (!domicilio) {
      await t.rollback();
      return errorResponse(res, 'Domicilio no encontrado', 404);
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
      if (domicilio.Pedido && domicilio.Pedido.metodoPago !== 'Abono') {
        await Pedido.update({
          esVenta: true,
          estadoVenta: 'completada',
          estadoPedido: 'entregado'
        }, { where: { id: domicilio.pedidoId }, transaction: t });
      }
    }
    if (tarifa_aplicada !== undefined) {
      const diferencia = tarifa_aplicada - (domicilio.tarifaAplicada || 0);
      if (diferencia !== 0 && domicilio.Pedido) {
        await Pedido.update({
          total: sequelize.literal(`total + ${diferencia}`)
        }, { where: { id: domicilio.pedidoId }, transaction: t });
      }
      updateData.tarifaAplicada = tarifa_aplicada;
    }

    await Domicilio.update(updateData, { where: { id: req.params.id }, transaction: t });

    if (domicilio.Pedido) {
      let nuevoEstadoPedido = estado;
      if (estado === 'asignado') nuevoEstadoPedido = 'asignado';
      if (estado === 'en_camino') nuevoEstadoPedido = 'en_camino';
      if (estado === 'entregado') nuevoEstadoPedido = 'entregado';
      if (estado === 'cancelado') nuevoEstadoPedido = 'cancelado';
      await Pedido.update({ estadoPedido: nuevoEstadoPedido }, { where: { id: domicilio.pedidoId }, transaction: t });
    }

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

    let domicilio = await Domicilio.findByPk(id, { transaction: t });
    if (!domicilio) {
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

    await Domicilio.update({
      repartidor: JSON.stringify(repartidorObj),
      repartidorId: repartidorId || null,
      fechaAsignacion: new Date()
    }, { where: { id: domicilio.id }, transaction: t });

    if (tarifa !== undefined && tarifa !== null) {
      const tarifaNum = parseFloat(tarifa);
      if (!isNaN(tarifaNum)) {
        const diferencia = tarifaNum - (domicilio.tarifaAplicada || 0);
        if (diferencia !== 0) {
          await Pedido.update({
            total: sequelize.literal(`total + ${diferencia}`)
          }, { where: { id: domicilio.pedidoId }, transaction: t });
        }
        await Domicilio.update({
          costo: tarifaNum,
          tarifaAplicada: tarifaNum
        }, { where: { id: domicilio.id }, transaction: t });
      }
    }

    if (['Pendiente', 'aprobado'].includes(domicilio.estado)) {
      await Domicilio.update({ estado: 'asignado' }, { where: { id: domicilio.id }, transaction: t });
    }

    const pedido = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
    if ( pedido && ['Pendiente', 'aprobado'].includes(pedido.estadoPedido)) {
      await Pedido.update({ estadoPedido: 'asignado' }, { where: { id: domicilio.pedidoId }, transaction: t });
    }

    await t.commit();

    const domicilioActualizado = await Domicilio.findByPk(domicilio.id, {
      include: [{ model: Pedido }]
    });
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
      include: [{ model: Pedido }]
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
  const t = await sequelize.transaction();
  try {
    const body = req.body || {};
    const domicilio = await Domicilio.findByPk(req.params.id, { 
      include: [{ model: Pedido }],
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
      body.repartidor = JSON.stringify({
        nombre: body.repartidor.nombre || '',
        telefono: body.repartidor.telefono || '',
        tipoVehiculo: body.repartidor.tipoVehiculo || '',
        placa: body.repartidor.placa || ''
      });
      body.fechaAsignacion = new Date();
    }

    if (body.observaciones !== undefined) body.notas = body.observaciones;

    delete body.observaciones;
    delete body.direccionData;

    await Domicilio.update(body, { where: { id: req.params.id }, transaction: t });
    
    await t.commit();
    
    const domicilioActualizado = await Domicilio.findByPk(req.params.id, {
      include: [{ model: Pedido }]
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