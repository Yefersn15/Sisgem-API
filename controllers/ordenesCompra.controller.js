const { OrdenCompra, Producto, Categoria, Marca, Proveedor, Usuario, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.listar = async (req, res) => {
  try {
    const ordenes = await OrdenCompra.findAll({
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['nombre', 'nit'] },
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    return successResponse(res, ordenes);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { proveedorId, productos, observaciones } = req.body;

    if (!proveedorId) return errorResponse(res, 'Proveedor es requerido', 400);
    if (!productos || productos.length === 0) return errorResponse(res, 'Debe incluir al menos un producto', 400);

    let subtotal = 0;
    const productosOrden = [];

    for (const item of productos) {
      if (!item.cantidad || !item.precio_unitario) {
        return errorResponse(res, 'Cantidad y precio unitario son requeridos por producto', 400);
      }

      const itemSubtotal = item.cantidad * item.precio_unitario;
      subtotal += itemSubtotal;

      productosOrden.push({
        productoExistenteId: item.productoExistenteId || null,
        nombre: item.nombre,
        descripcion: item.descripcion,
        imagen: item.imagen,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: itemSubtotal
      });
    }

    const nuevaOrden = await OrdenCompra.create({
      proveedorId,
      usuarioId: req.user.documento,
      productos: productosOrden,
      subtotal,
      total: subtotal,
      observaciones,
      estado: 'borrador'
    }, { transaction: t });

    await t.commit();

    const ordenCreada = await OrdenCompra.findByPk(nuevaOrden.id, {
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['nombre', 'nit'] },
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'email'] }
      ]
    });

    return successResponse(res, ordenCreada, 'Orden de compra creada', 201);
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const orden = await OrdenCompra.findByPk(id, {
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['nombre', 'nit', 'email', 'telefono'] },
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'email'] }
      ]
    });

    if (!orden) return errorResponse(res, 'Orden no encontrada', 404);

    return successResponse(res, orden);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { productos, observaciones, estado } = req.body;

    const orden = await OrdenCompra.findByPk(id);
    if (!orden) return errorResponse(res, 'Orden no encontrada', 404);

    if (orden.estado !== 'borrador') {
      return errorResponse(res, 'No se puede modificar una orden que no está en borrador', 400);
    }

    if (productos && productos.length > 0) {
      let subtotal = 0;
      const productosOrden = [];

      for (const item of productos) {
        if (!item.cantidad || !item.precio_unitario) {
          return errorResponse(res, 'Cantidad y precio unitario son requeridos por producto', 400);
        }

        const itemSubtotal = item.cantidad * item.precio_unitario;
        subtotal += itemSubtotal;

        productosOrden.push({
          productoExistenteId: item.productoExistenteId || null,
          nombre: item.nombre,
          descripcion: item.descripcion,
          imagen: item.imagen,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: itemSubtotal
        });
      }

      await orden.update({
        productos: productosOrden,
        subtotal,
        total: subtotal
      });
    }

    if (observaciones !== undefined) {
      await orden.update({ observaciones });
    }

    return successResponse(res, orden, 'Orden actualizada');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const orden = await OrdenCompra.findByPk(id, { transaction: t });
    if (!orden) return errorResponse(res, 'Orden no encontrada', 404);

    const transiciones = {
      'borrador': ['enviada', 'cancelada'],
      'enviada': ['confirmada', 'cancelada'],
      'confirmada': ['recibida', 'cancelada'],
      'recibida': [],
      'cancelada': []
    };

    if (!transiciones[orden.estado]?.includes(estado)) {
      await t.rollback();
      return errorResponse(res, `No se puede pasar de ${orden.estado} a ${estado}`, 400);
    }

    if (estado === 'confirmada') {
      for (const item of orden.productos) {
        if (item.productoExistenteId) {
          const producto = await Producto.findByPk(item.productoExistenteId, { transaction: t });
          if (producto) {
            await producto.update({ stock: producto.stock + item.cantidad }, { transaction: t });
          }
        }
      }
    }

    await orden.update({ estado }, { transaction: t });
    await t.commit();

    return successResponse(res, orden, 'Estado actualizado');
  } catch (error) {
    await t.rollback();
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const orden = await OrdenCompra.findByPk(id);
    if (!orden) return errorResponse(res, 'Orden no encontrada', 404);

    if (!['borrador', 'cancelada'].includes(orden.estado)) {
      return errorResponse(res, 'No se puede eliminar una orden que no está en borrador o cancelada', 400);
    }

    await orden.destroy();

    return successResponse(res, null, 'Orden eliminada');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.verificarProductosExistentes = async (req, res) => {
  try {
    const { productos } = req.body;
    
    if (!productos || productos.length === 0) {
      return successResponse(res, []);
    }
    
    const resultados = [];
    
    for (const item of productos) {
      const producto = await Producto.findByPk(item.productoId);
      resultados.push({
        productoId: item.productoId,
        existe: !!producto,
        stockActual: producto?.stock || 0,
        nombre: producto?.nombre || 'Producto no encontrado'
      });
    }
    
    return successResponse(res, resultados);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.pedirMasStock = async (req, res) => {
  try {
    const { productoId, cantidad, proveedorId, precio_unitario, observaciones } = req.body;
    
    if (!productoId || !cantidad || !proveedorId) {
      return errorResponse(res, 'Producto, cantidad y proveedor son requeridos', 400);
    }
    
    const producto = await Producto.findByPk(productoId);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }
    
    const nuevaOrden = await OrdenCompra.create({
      proveedorId,
      usuarioId: req.user.documento,
      productos: [{
        productoExistenteId: productoId,
        cantidad: cantidad,
        precio_unitario: precio_unitario || producto.precio,
        subtotal: cantidad * (precio_unitario || producto.precio)
      }],
      subtotal: cantidad * (precio_unitario || producto.precio),
      total: cantidad * (precio_unitario || producto.precio),
      observaciones: observaciones || `Pedido de stock para ${producto.nombre}`,
      estado: 'borrador'
    });
    
    const ordenCreada = await OrdenCompra.findByPk(nuevaOrden.id, {
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['nombre', 'nit'] },
        { model: Usuario, as: 'usuario', attributes: ['nombre', 'email'] }
      ]
    });
    
    return successResponse(res, ordenCreada, 'Orden de compra creada para reabastecimiento', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};