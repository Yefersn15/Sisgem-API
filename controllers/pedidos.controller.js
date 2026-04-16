const { Pedido, Producto, Usuario, Domicilio, Pago, sequelize, Op } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.crear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    console.log('Crear pedido - body:', req.body);
    const { tipo_venta, productos, observaciones, metodo_pago, telefonoContacto, direccion } = req.body;
    const metodoPago = metodo_pago;
    const tipoVenta = tipo_venta;
    const telefono = telefonoContacto || (direccion && direccion.telefono) || null;
    
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return errorResponse(res, 'Se requiere al menos un producto', 400);
    }

    let subtotal = 0;
    const productosPedido = [];

    for (const item of productos) {
      if (!item.producto) return errorResponse(res, 'ID de producto requerido', 400);
      const producto = await Producto.findByPk(item.producto, { transaction: t });
      if (!producto) {
        await t.rollback();
        return errorResponse(res, `Producto ${item.producto} no encontrado`, 404);
      }

      const itemSubtotal = item.cantidad * item.precio_unitario;
      subtotal += itemSubtotal;

      const snapshot = {
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen
      };

      productosPedido.push({
        producto: item.producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: itemSubtotal,
        productoSnapshot: snapshot
      });

      const esVentaInmediata = metodoPago !== 'Abono' && tipoVenta === 'mostrador';
      if (esVentaInmediata) {
        const nuevoStock = producto.stock - item.cantidad;
        if (nuevoStock < 0) {
          await t.rollback();
          return errorResponse(res, `Stock insuficiente para producto ${producto.nombre}`, 400);
        }
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

    const nuevoPedido = await Pedido.create({
      usuarioId: req.user.documento,
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
        telefono: telefono,
        estado: 'Pendiente',
        costo: 0,
        tarifa_aplicada: 0,
        datos_front: direccion
      }, { transaction: t });
    }

    await t.commit();

    const pedidoCreado = await Pedido.findByPk(nuevoPedido.id, {
      include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'email'] }]
    });

    return successResponse(res, pedidoCreado, 'Pedido creado', 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstadoPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { estado_pedido } = req.body;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return errorResponse(res, 'Pedido no encontrado', 404);
    }
    if (pedido.esVenta) {
      await t.rollback();
      return errorResponse(res, 'No se puede modificar estado de una venta', 400);
    }

    const transiciones = {
      'Pendiente': ['aprobado', 'cancelado'],
      'aprobado': ['en_preparacion', 'cancelado'],
      'en_preparacion': ['asignado', 'cancelado'],
      'asignado': ['en_camino', 'cancelado'],
      'en_camino': ['entregado'],
      'entregado': ['recibido'],
      'recibido': [],
      'cancelado': []
    };
    if (!transiciones[pedido.estadoPedido]?.includes(estado_pedido)) {
      await t.rollback();
      return errorResponse(res, `No se puede pasar de ${pedido.estadoPedido} a ${estado_pedido}`, 400);
    }

    await pedido.update({ estadoPedido: estado_pedido }, { transaction: t });

    // If the order is delivered, update payments, convert to sale if paid, and deduct stock
    if (estado_pedido === 'entregado') {
      const { actualizarTotalPagado } = require('./pagos.controller');
      await actualizarTotalPagado(pedido.id, t);

      // Fetch updated pedido to get productos
      const pedidoActualizado = await Pedido.findByPk(pedido.id, { transaction: t });

      // Deduct stock from products
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
    }

    await t.commit();
    return successResponse(res, pedido, 'Estado actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.listarPedidos = async (req, res) => {
  try {
    const { estado, fecha } = req.query;
    const where = {};

    if (estado) where.estadoPedido = estado;

    const pedidos = await Pedido.findAll({
      where,
      include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido', 'email', 'telefono'] }],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, pedidos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.listarVentas = async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      where: { esVenta: true },
      include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido', 'email', 'telefono'] }],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, pedidos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.misPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      where: { usuarioId: req.user.documento },
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, pedidos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id, {
      include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'apellido', 'email', 'telefono'] }]
    });

    if (!pedido) return errorResponse(res, 'Pedido no encontrado', 404);

    if (req.user.rol !== 'ADMIN' && req.user.rol !== 'ADMINISTRADOR' && pedido.usuarioId !== req.user.documento) {
      return errorResponse(res, 'No autorizado', 403);
    }

    return successResponse(res, pedido);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.aprobarAbono = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return errorResponse(res, 'Pedido no encontrado', 404);
    }
    if (pedido.esVenta) {
      await t.rollback();
      return errorResponse(res, 'Ya es una venta', 400);
    }
    if (pedido.estadoPedido !== 'Pendiente') {
      await t.rollback();
      return errorResponse(res, 'El pedido ya fue procesado', 400);
    }

    // Check if domicilio already exists to avoid duplicate creation
    if (pedido.tipoVenta === 'domicilio') {
      const domicilioExistente = await Domicilio.findOne({
        where: { pedidoId: pedido.id },
        transaction: t
      });
      if (domicilioExistente) {
        await t.rollback();
        return errorResponse(res, 'Ya existe un domicilio para este pedido', 400);
      }
    }

    await pedido.update({ estadoPedido: 'aprobado' }, { transaction: t });

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
    return successResponse(res, pedido, 'Pedido aprobado - flujo de domicilio');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.convertirAVenta = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return errorResponse(res, 'Pedido no encontrado', 404);
    }
    if (pedido.esVenta) {
      await t.rollback();
      return errorResponse(res, 'Ya es una venta', 400);
    }
    if (pedido.metodoPago !== 'Abono') {
      await t.rollback();
      return errorResponse(res, 'Solo se pueden convertir pedidos por abono', 400);
    }
    if (pedido.estadoPedido !== 'Pendiente') {
      await t.rollback();
      return errorResponse(res, 'El pedido ya fue procesado', 400);
    }

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

    await pedido.update({
      esVenta: true,
      estadoVenta: 'completada'
    }, { transaction: t });

    await t.commit();
    return successResponse(res, pedido, 'Convertido a venta');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipoVenta, productos, observaciones, metodoPago, telefonoContacto, direccion, estadoPedido } = req.body;

    const pedido = await Pedido.findByPk(id);
    if (!pedido) return errorResponse(res, 'Pedido no encontrado', 404);

    await pedido.update({
      tipoVenta: tipoVenta !== undefined ? tipoVenta : pedido.tipoVenta,
      observaciones: observaciones !== undefined ? observaciones : pedido.observaciones,
      metodoPago: metodoPago !== undefined ? metodoPago : pedido.metodoPago,
      telefonoContacto: telefonoContacto !== undefined ? telefonoContacto : pedido.telefonoContacto,
      direccion: direccion !== undefined ? JSON.stringify(direccion) : pedido.direccion,
      estadoPedido: estadoPedido !== undefined ? estadoPedido : pedido.estadoPedido
    });

    return successResponse(res, pedido, 'Pedido actualizado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id);
    if (!pedido) return errorResponse(res, 'Pedido no encontrado', 404);

    await pedido.destroy();

    return successResponse(res, null, 'Pedido eliminado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.cancelar = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id);
    if (!pedido) return errorResponse(res, 'Pedido no encontrado', 404);
    if (pedido.esVenta) return errorResponse(res, 'No se puede cancelar una venta', 400);

    await pedido.update({ estadoPedido: 'cancelado' });

    return successResponse(res, pedido, 'Pedido cancelado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.aprobarPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return errorResponse(res, 'Pedido no encontrado', 404);
    }

    if (pedido.estadoPedido !== 'Pendiente') {
      await t.rollback();
      return errorResponse(res, 'El pedido ya fue procesado', 400);
    }

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

    await pedido.update({ estadoPedido: 'aprobado' }, { transaction: t });

    await t.commit();
    return successResponse(res, pedido, 'Pedido aprobado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.rechazarAbono = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const pedido = await Pedido.findByPk(id);
    if (!pedido) return errorResponse(res, 'Pedido no encontrado', 404);
    if (pedido.esVenta) return errorResponse(res, 'No es un pedido por abono', 400);
    if (pedido.estadoPedido !== 'Pendiente') return errorResponse(res, 'El pedido ya fue procesado', 400);
    if (pedido.metodoPago !== 'Abono') return errorResponse(res, 'No es un pedido por abono', 400);

    await pedido.update({ 
      estadoPedido: 'rechazado',
      observaciones: motivo ? `${pedido.observaciones || ''}\n[RECHAZADO]: ${motivo}`.trim() : pedido.observaciones
    });

    return successResponse(res, pedido, 'Abono rechazado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};