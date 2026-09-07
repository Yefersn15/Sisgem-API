// Lógica de negocio y acceso a datos de domicilios. No conoce Express.
const { Pedido, Pago, Usuario, sequelize } = require('../../models');
const repository = require('./domicilios.repository');
const AppError = require('../../utils/AppError');
const pagosService = require('../pagos/pagos.service');
const { descontarStock, liquidarEntregaDePedido } = require('./domicilios.liquidacion');

const TRANSICIONES_DOMICILIO = {
  'Pendiente': ['aprobado', 'cancelado'],
  'aprobado': ['asignado', 'cancelado'],
  'asignado': ['en_camino', 'cancelado'],
  'en_camino': ['entregado'],
  'entregado': [],
  'cancelado': []
};

exports.listar = async ({ estado, pedido, pagination }) => {
  const where = {};
  if (estado) where.estado = estado;
  if (pedido) where.pedidoId = pedido;

  return repository.findAndCountAll({ where, pagination });
};

exports.crear = async (data) => {
  const { pedidoId, direccion, tarifa, repartidor, telefono_repartidor, ciudad, barrio, telefono } = data;
  const t = await sequelize.transaction();

  try {
    const pedidoData = await Pedido.findByPk(pedidoId, { transaction: t });
    if (!pedidoData) throw new AppError('Pedido no encontrado', 404);
    if (pedidoData.tipoVenta !== 'domicilio') throw new AppError('El pedido no es de tipo domicilio', 400);
    if (pedidoData.estadoPedido === 'Pendiente') throw new AppError('No se puede crear domicilio: el pedido debe estar aprobado', 400);

    let repartidorData = null;
    if (repartidor && typeof repartidor === 'object') {
      repartidorData = { nombre: repartidor.nombre || '', telefono: repartidor.telefono || '', tipoVehiculo: repartidor.tipoVehiculo || '', placa: repartidor.placa || '' };
    } else if (repartidor && typeof repartidor === 'string') {
      repartidorData = { nombre: repartidor, telefono: telefono_repartidor || '', tipoVehiculo: '', placa: '' };
    }

    let direccionData = direccion;
    if (typeof direccion === 'string') {
      direccionData = { direccion, barrio: barrio || '', telefono: telefono || '' };
    } else if (direccion && typeof direccion === 'object') {
      direccionData = {
        direccion: direccion.direccion || '',
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

    const nuevoDomicilio = await repository.create({
      pedidoId,
      direccion: typeof direccionData === 'string' ? direccionData : JSON.stringify(direccionData),
      ciudad: ciudad || '',
      barrio: barrio || '',
      telefono: telefono || '',
      costo: tarifaAplicada,
      tarifaAplicada,
      repartidor: repartidorData || null,
      repartidorId: repartidor?.id || null,
      estado: repartidorData && repartidorData.nombre ? 'asignado' : 'Pendiente'
    }, { transaction: t });

    const nuevoTotal = parseFloat(pedidoData.total) + tarifaAplicada;
    const nuevoEstado = (repartidorData && repartidorData.nombre) ? 'asignado' : 'Pendiente';
    await Pedido.update({ total: nuevoTotal, estadoPedido: nuevoEstado }, { where: { id: pedidoId }, transaction: t });

    await t.commit();
    return repository.findByIdConPedido(nuevoDomicilio.id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.obtenerPorId = async (id) => {
  const domicilio = await repository.findByIdConPedido(id);
  if (!domicilio) throw new AppError('Domicilio no encontrado', 404);
  return domicilio;
};

exports.cambiarEstado = async (id, { estado, tarifa_aplicada, forzar }) => {
  const t = await sequelize.transaction();
  try {
    const domicilio = await repository.findByIdConPedido(id, { transaction: t });
    if (!domicilio) throw new AppError('Domicilio no encontrado', 404);

    const pedido = domicilio.pedido;
    if (!pedido) throw new AppError('Pedido asociado no encontrado', 404);
    if (String(pedido.estadoPedido || '').toLowerCase() === 'pendiente') {
      throw new AppError('No se puede cambiar estado de domicilio: el pedido está en estado Pendiente', 400);
    }

    // Si el domicilio ya está entregado y el pedido no se convirtió, forzar la conversión.
    if (domicilio.estado === 'entregado' && !pedido.esVenta && (forzar === true || estado === 'entregado')) {
      await pagosService.actualizarTotalPagado(pedido.id, t);
      const pedidoActualizado = await Pedido.findByPk(pedido.id, { transaction: t });
      const saldoPendiente = parseFloat(pedidoActualizado.total) - (parseFloat(pedidoActualizado.totalPagado) || 0);

      if (saldoPendiente <= 0) {
        await pedidoActualizado.update({ esVenta: true, estadoVenta: 'completada' }, { transaction: t });
      } else {
        await Pago.create({
          pedidoId: pedido.id, monto: saldoPendiente, metodo: 'Contraentrega',
          estado: 'aplicado', referencia: 'Pago automático al entregar domicilio', tipo: 'pago_total'
        }, { transaction: t });
        await pagosService.actualizarTotalPagado(pedido.id, t);
      }

      await descontarStock(pedidoActualizado.productos, t);
      await t.commit();
      return domicilio;
    }

    if (!TRANSICIONES_DOMICILIO[domicilio.estado]?.includes(estado)) {
      throw new AppError(`No se puede pasar de ${domicilio.estado} a ${estado}`, 400);
    }

    const updateData = { estado };
    if (estado === 'entregado') {
      updateData.fechaAsignacion = new Date();
      const pedidoActual = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
      await liquidarEntregaDePedido(pedidoActual, t);
      await descontarStock(pedido.productos, t);
    }

    if (tarifa_aplicada !== undefined) {
      const diferencia = tarifa_aplicada - (domicilio.tarifaAplicada || 0);
      if (diferencia !== 0) {
        await Pedido.update({ total: sequelize.literal(`total + ${diferencia}`) }, { where: { id: pedido.id }, transaction: t });
      }
      updateData.tarifaAplicada = tarifa_aplicada;
    }

    await repository.updateById(id, updateData, { transaction: t });
    await t.commit();

    return repository.findById(id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.asignarRepartidor = require('./domicilios.repartidor').asignarRepartidor;

exports.porCliente = async (usuarioId) => {
  const usuarioData = await Usuario.findByPk(usuarioId);
  if (!usuarioData) throw new AppError('Usuario no encontrado', 404);

  const pedidos = await Pedido.findAll({ where: { usuarioId, tipoVenta: 'domicilio' } });
  const pedidosIds = pedidos.map(p => p.id);

  return repository.findAllPorPedidos(pedidosIds);
};

exports.misDomicilios = async (repartidorId) => {
  return repository.findAllPorRepartidor(repartidorId);
};

exports.misPedidosDomicilio = async (usuarioId) => {
  const pedidos = await Pedido.findAll({ where: { usuarioId, tipoVenta: 'domicilio' }, order: [['createdAt', 'DESC']] });
  const pedidosIds = pedidos.map(p => p.id);

  return repository.findAllPorPedidosConUsuario(pedidosIds);
};

exports.actualizar = async (id, body) => {
  const t = await sequelize.transaction();
  try {
    const domicilio = await repository.findByIdConPedido(id, { transaction: t });
    if (!domicilio) throw new AppError('Domicilio no encontrado', 404);

    const data = { ...body };

    if (data.direccion && typeof data.direccion === 'object') {
      data.direccion = JSON.stringify({
        direccion: data.direccion.direccion || '',
        direccion2: data.direccion.direccion2 || data.direccion.apartamento || '',
        barrio: data.direccion.barrio,
        telefono: data.direccion.telefono
      });
    }

    if (data.tarifa !== undefined && data.tarifa !== null) {
      const num = Number(String(data.tarifa).replace(/[^0-9.\-]/g, ''));
      const nueva = isNaN(num) ? 0 : num;
      const diferencia = nueva - (domicilio.tarifaAplicada || 0);
      if (diferencia !== 0 && domicilio.pedido) {
        await Pedido.update({ total: sequelize.literal(`total + ${diferencia}`) }, { where: { id: domicilio.pedidoId }, transaction: t });
      }
      data.costo = nueva;
      data.tarifaAplicada = nueva;
    }

    if (data.repartidor && typeof data.repartidor === 'object') {
      data.repartidor = {
        nombre: data.repartidor.nombre || '',
        telefono: data.repartidor.telefono || '',
        tipoVehiculo: data.repartidor.tipoVehiculo || '',
        placa: data.repartidor.placa || ''
      };
      data.fechaAsignacion = new Date();
    }

    if (data.observaciones !== undefined) data.notas = data.observaciones;
    delete data.observaciones;
    delete data.direccionData;
    delete data.tarifa;

    await repository.updateById(id, data, { transaction: t });
    await t.commit();

    return repository.findByIdConPedido(id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.actualizarTarifa = async (id, tarifa) => {
  const t = await sequelize.transaction();
  try {
    const domicilio = await repository.findById(id, { transaction: t });
    if (!domicilio) throw new AppError('Domicilio no encontrado', 404);

    const diferencia = tarifa - domicilio.tarifaAplicada;
    await Pedido.update({ total: sequelize.literal(`total + ${diferencia}`) }, { where: { id: domicilio.pedidoId }, transaction: t });
    await repository.updateById(id, { costo: tarifa, tarifaAplicada: tarifa }, { transaction: t });

    await t.commit();
    return repository.findById(id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.listarTarifas = async () => [];

exports.cambiarEstadoRepartidor = async (id, estado, repartidorId) => {
  const t = await sequelize.transaction();
  try {
    const domicilio = await repository.findByIdConPedido(id, { transaction: t });
    if (!domicilio) throw new AppError('Domicilio no encontrado', 404);

    const pedido = domicilio.pedido;
    if (!pedido) throw new AppError('Pedido asociado no encontrado', 404);
    if (String(pedido.estadoPedido || '').toLowerCase() === 'pendiente') {
      throw new AppError('No se puede cambiar estado de domicilio: el pedido está en estado Pendiente', 400);
    }
    if (domicilio.repartidorId !== repartidorId) {
      throw new AppError('No tienes permiso para modificar este domicilio', 403);
    }

    if (!TRANSICIONES_DOMICILIO[domicilio.estado]?.includes(estado)) {
      throw new AppError(`No se puede pasar de ${domicilio.estado} a ${estado}`, 400);
    }

    const updateData = { estado };
    if (estado === 'entregado') {
      updateData.fechaAsignacion = new Date();
      const pedidoActual = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
      await liquidarEntregaDePedido(pedidoActual, t);
      await descontarStock(pedido.productos, t);
    }

    await repository.updateById(id, updateData, { transaction: t });
    await t.commit();

    return repository.findById(id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
