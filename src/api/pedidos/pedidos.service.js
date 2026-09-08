// Lógica de negocio y acceso a datos de pedidos. No conoce Express.
const { Producto, Domicilio, sequelize } = require('../../models');
const repository = require('./pedidos.repository');
const AppError = require('../../utils/AppError');
const pagosService = require('../pagos/pagos.service');

// Solo trazabilidad de qué trabajador aprobó/canceló/gestionó por última vez
// este pedido (se muestra en el detalle); a propósito no restringe quién más
// puede seguir gestionándolo, porque distintos trabajadores por turno
// procesan los mismos pedidos de los clientes.
const marcarUltimaAccion = (requester) => ({
  ultimaAccionPorDocumento: requester?.documento || null,
  ultimaAccionPorNombre: requester?.nombre || null,
});

const TRANSICIONES_PEDIDO = {
  'Pendiente': ['aprobado', 'cancelado'],
  'aprobado': ['en_preparacion', 'cancelado'],
  'en_preparacion': ['asignado', 'cancelado'],
  'asignado': ['en_camino', 'cancelado'],
  'en_camino': ['entregado'],
  'entregado': ['recibido'],
  'recibido': [],
  'cancelado': []
};

exports.crear = async (usuarioId, data) => {
  const { tipo_venta, productos, observaciones, metodo_pago, telefonoContacto, direccion } = data;
  const metodoPago = metodo_pago;
  const tipoVenta = tipo_venta;
  const telefono = telefonoContacto || (direccion && direccion.telefono) || null;

  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    throw new AppError('Se requiere al menos un producto', 400);
  }

  const t = await sequelize.transaction();
  try {
    let subtotal = 0;
    const productosPedido = [];

    for (const item of productos) {
      if (!item.producto) throw new AppError('ID de producto requerido', 400);
      const producto = await Producto.findByPk(item.producto, { transaction: t });
      if (!producto) throw new AppError(`Producto ${item.producto} no encontrado`, 404);

      const itemSubtotal = item.cantidad * item.precio_unitario;
      subtotal += itemSubtotal;

      productosPedido.push({
        producto: item.producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: itemSubtotal,
        productoSnapshot: { id: producto.id, nombre: producto.nombre, precio: producto.precio, imagen: producto.imagen }
      });

      const esVentaInmediata = metodoPago !== 'Abono' && tipoVenta === 'mostrador';
      if (esVentaInmediata) {
        const nuevoStock = producto.stock - item.cantidad;
        if (nuevoStock < 0) throw new AppError(`Stock insuficiente para producto ${producto.nombre}`, 400);
        await producto.update({ stock: nuevoStock }, { transaction: t });
      }
    }

    let estadoPedido = 'Pendiente';
    let esVenta = false;
    if (metodoPago !== 'Abono' && tipoVenta === 'mostrador') {
      estadoPedido = 'aprobado';
      esVenta = true;
    } else if (metodoPago !== 'Abono' && tipoVenta === 'domicilio') {
      estadoPedido = 'aprobado';
    }

    const nuevoPedido = await repository.create({
      usuarioId,
      tipoVenta: tipoVenta || 'mostrador',
      productos: productosPedido,
      subtotal,
      total: subtotal,
      observaciones,
      metodoPago: metodoPago || 'Efectivo',
      estadoPedido,
      esVenta,
      estadoVenta: esVenta ? 'completada' : null,
      telefonoContacto: telefono,
      direccion: direccion ? {
        direccion: direccion.direccion || direccion,
        direccion2: direccion.direccion2 || '',
        barrio: direccion.barrio,
        telefono: direccion.telefono
      } : null
    }, { transaction: t });

    if (tipoVenta === 'domicilio' && metodoPago !== 'Abono') {
      await Domicilio.create({
        pedidoId: nuevoPedido.id,
        direccion: direccion?.direccion || '',
        direccion2: direccion?.direccion2 || '',
        barrio: direccion?.barrio || '',
        ciudad: '',
        telefono,
        estado: 'Pendiente',
        costo: 0,
        tarifa_aplicada: 0,
        datos_front: direccion
      }, { transaction: t });
    }

    await t.commit();

    return repository.findByIdConUsuario(nuevoPedido.id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const descontarStock = async (productos, t) => {
  for (const item of (productos || [])) {
    const producto = await Producto.findByPk(item.producto, { transaction: t });
    if (producto) {
      const nuevoStock = producto.stock - item.cantidad;
      if (nuevoStock < 0) throw new AppError(`Stock insuficiente para producto ${producto.nombre}`, 400);
      await producto.update({ stock: nuevoStock }, { transaction: t });
    }
  }
};

exports.cambiarEstadoPedido = async (id, estadoPedido, requester) => {
  const t = await sequelize.transaction();
  try {
    const pedido = await repository.findById(id, { transaction: t });
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (pedido.esVenta) throw new AppError('No se puede modificar estado de una venta', 400);

    if (!TRANSICIONES_PEDIDO[pedido.estadoPedido]?.includes(estadoPedido)) {
      throw new AppError(`No se puede pasar de ${pedido.estadoPedido} a ${estadoPedido}`, 400);
    }

    await pedido.update({ estadoPedido, ...marcarUltimaAccion(requester) }, { transaction: t });

    if (estadoPedido === 'entregado') {
      await pagosService.actualizarTotalPagado(pedido.id, t);
      const pedidoActualizado = await repository.findById(pedido.id, { transaction: t });
      await descontarStock(pedidoActualizado.productos, t);
    }

    await t.commit();
    return pedido;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.listarPedidos = async ({ estado, pagination }) => {
  const where = {};
  if (estado) where.estadoPedido = estado;

  return repository.findAndCountAll({ where, pagination });
};

exports.listarVentas = async ({ pagination }) => {
  return repository.findAndCountAll({ where: { esVenta: true }, pagination });
};

exports.misPedidos = async (usuarioId) => {
  return repository.findAllPorUsuario(usuarioId);
};

exports.verDetalle = async (id, user) => {
  const pedido = await repository.findByIdConUsuarioCompleto(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);

  const esAdmin = user.rol === 'ADMIN' || user.rol === 'ADMINISTRADOR';
  if (!esAdmin && pedido.usuarioId !== user.documento) {
    throw new AppError('No autorizado', 403);
  }

  return pedido;
};

exports.aprobarAbono = async (id, requester) => {
  const t = await sequelize.transaction();
  try {
    const pedido = await repository.findById(id, { transaction: t });
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (pedido.esVenta) throw new AppError('Ya es una venta', 400);
    if (pedido.estadoPedido !== 'Pendiente') throw new AppError('El pedido ya fue procesado', 400);

    if (pedido.tipoVenta === 'domicilio') {
      const domicilioExistente = await Domicilio.findOne({ where: { pedidoId: pedido.id }, transaction: t });
      if (domicilioExistente) throw new AppError('Ya existe un domicilio para este pedido', 400);
    }

    await pedido.update({ estadoPedido: 'aprobado', ...marcarUltimaAccion(requester) }, { transaction: t });

    if (pedido.tipoVenta === 'domicilio') {
      const direccion = pedido.direccion;
      await Domicilio.create({
        pedidoId: pedido.id,
        direccion: direccion?.direccion || '',
        direccion2: direccion?.direccion2 || '',
        barrio: direccion?.barrio || '',
        ciudad: '',
        telefono: direccion?.telefono || pedido.telefonoContacto,
        estado: 'Pendiente',
        costo: 0,
        tarifaAplicada: 0,
        datos_front: direccion
      }, { transaction: t });
    }

    await t.commit();
    return pedido;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.convertirAVenta = async (id, requester) => {
  const t = await sequelize.transaction();
  try {
    const pedido = await repository.findById(id, { transaction: t });
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (pedido.esVenta) throw new AppError('Ya es una venta', 400);
    if (pedido.metodoPago !== 'Abono') throw new AppError('Solo se pueden convertir pedidos por abono', 400);
    if (pedido.estadoPedido !== 'Pendiente') throw new AppError('El pedido ya fue procesado', 400);

    await descontarStock(pedido.productos, t);
    await pedido.update({ esVenta: true, estadoVenta: 'completada', ...marcarUltimaAccion(requester) }, { transaction: t });

    await t.commit();
    return pedido;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.actualizar = async (id, data) => {
  const { tipoVenta, observaciones, metodoPago, telefonoContacto, direccion, estadoPedido } = data;

  const pedido = await repository.findById(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);

  await pedido.update({
    tipoVenta: tipoVenta !== undefined ? tipoVenta : pedido.tipoVenta,
    observaciones: observaciones !== undefined ? observaciones : pedido.observaciones,
    metodoPago: metodoPago !== undefined ? metodoPago : pedido.metodoPago,
    telefonoContacto: telefonoContacto !== undefined ? telefonoContacto : pedido.telefonoContacto,
    direccion: direccion !== undefined ? JSON.stringify(direccion) : pedido.direccion,
    estadoPedido: estadoPedido !== undefined ? estadoPedido : pedido.estadoPedido
  });

  return pedido;
};

exports.eliminar = async (id) => {
  const pedido = await repository.findById(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);
  await pedido.destroy();
};

exports.cancelar = async (id, requester) => {
  const pedido = await repository.findById(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);
  if (pedido.esVenta) throw new AppError('No se puede cancelar una venta', 400);

  await pedido.update({ estadoPedido: 'cancelado', ...marcarUltimaAccion(requester) });
  return pedido;
};

exports.aprobarPedido = async (id, requester) => {
  const t = await sequelize.transaction();
  try {
    const pedido = await repository.findById(id, { transaction: t });
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (pedido.estadoPedido !== 'Pendiente') throw new AppError('El pedido ya fue procesado', 400);

    await descontarStock(pedido.productos, t);
    await pedido.update({ estadoPedido: 'aprobado', ...marcarUltimaAccion(requester) }, { transaction: t });

    await t.commit();
    return pedido;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

exports.rechazarAbono = async (id, motivo, requester) => {
  const pedido = await repository.findById(id);
  if (!pedido) throw new AppError('Pedido no encontrado', 404);
  if (pedido.esVenta) throw new AppError('No es un pedido por abono', 400);
  if (pedido.estadoPedido !== 'Pendiente') throw new AppError('El pedido ya fue procesado', 400);
  if (pedido.metodoPago !== 'Abono') throw new AppError('No es un pedido por abono', 400);

  await pedido.update({
    estadoPedido: 'rechazado',
    observaciones: motivo ? `${pedido.observaciones || ''}\n[RECHAZADO]: ${motivo}`.trim() : pedido.observaciones,
    ...marcarUltimaAccion(requester)
  });

  return pedido;
};
