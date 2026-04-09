const { Usuario, Producto } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.obtenerCarrito = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.documento, {
      attributes: ['carrito']
    });
    
    const carrito = usuario.carrito || [];
    
    const itemsConProducto = [];
    for (const item of carrito) {
      const producto = await Producto.findByPk(item.productoId);
      if (producto) {
        itemsConProducto.push({
          productoId: item.productoId,
          cantidad: item.cantidad,
          producto: producto
        });
      }
    }
    
    return successResponse(res, { items: itemsConProducto });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.agregarItem = async (req, res) => {
  try {
    const { productoId, cantidad = 1 } = req.body;
    if (!productoId) return errorResponse(res, 'ID de producto requerido', 400);

    const producto = await Producto.findByPk(productoId);
    if (!producto) return errorResponse(res, 'Producto no encontrado', 404);

    const usuario = await Usuario.findByPk(req.user.documento);
    let carrito = usuario.carrito || [];

    const itemIndex = carrito.findIndex(item => item.productoId === parseInt(productoId));
    if (itemIndex > -1) {
      carrito[itemIndex].cantidad += cantidad;
    } else {
      carrito.push({ productoId: parseInt(productoId), cantidad });
    }

    await usuario.update({ carrito });

    return successResponse(res, { items: carrito }, 'Producto agregado al carrito');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.actualizarItem = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { cantidad } = req.body;
    if (cantidad < 1) return errorResponse(res, 'Cantidad debe ser mayor a 0', 400);

    const usuario = await Usuario.findByPk(req.user.documento);
    let carrito = usuario.carrito || [];

    const itemIndex = carousel.findIndex(item => item.productoId === parseInt(productoId));
    if (itemIndex === -1) return errorResponse(res, 'Producto no está en el carrito', 404);

    carousel[itemIndex].cantidad = cantidad;
    await usuario.update({ carrito: carousel });

    return successResponse(res, { items: carousel }, 'Cantidad actualizada');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.eliminarItem = async (req, res) => {
  try {
    const { productoId } = req.params;
    const usuario = await Usuario.findByPk(req.user.documento);
    let carousel = usuario.carrito || [];

    carousel = carousel.filter(item => item.productoId !== parseInt(productoId));
    await usuario.update({ carousel });

    return successResponse(res, { items: carousel }, 'Producto eliminado del carrito');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.vaciarCarrito = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.documento);
    await usuario.update({ carrito: [] });
    return successResponse(res, { items: [] }, 'Carrito vaciado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};