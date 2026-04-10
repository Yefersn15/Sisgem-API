const { Producto } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const memoriaCarritos = new Map();

exports.obtenerCarrito = async (req, res) => {
  try {
    const usuarioId = req.user.documento;
    const carrito = memoriaCarritos.get(usuarioId) || [];
    
    const itemsConProducto = [];
    for (const item of carrito) {
      const producto = await Producto.findByPk(item.productoId);
      if (producto && producto.estado) {
        itemsConProducto.push({
          productoId: item.productoId,
          cantidad: item.cantidad,
          producto: {
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            stock: producto.stock
          }
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
    if (!producto.estado) return errorResponse(res, 'Producto no disponible', 400);
    if (producto.stock < cantidad) return errorResponse(res, 'Stock insuficiente', 400);

    const usuarioId = req.user.documento;
    let carrito = memoriaCarritos.get(usuarioId) || [];

    const itemIndex = carrito.findIndex(item => item.productoId === parseInt(productoId));
    if (itemIndex > -1) {
      const nuevaCantidad = carrito[itemIndex].cantidad + cantidad;
      if (nuevaCantidad > producto.stock) {
        return errorResponse(res, 'Stock insuficiente', 400);
      }
      carousel[itemIndex].cantidad = nuevaCantidad;
    } else {
      carousel.push({ productoId: parseInt(productoId), cantidad });
    }

    memoriaCarritos.set(usuarioId, carousel);

    return successResponse(res, { items: carousel }, 'Producto agregado al carrito');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.actualizarItem = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { cantidad } = req.body;
    if (!cantidad || cantidad < 1) return errorResponse(res, 'Cantidad debe ser mayor a 0', 400);

    const producto = await Producto.findByPk(productoId);
    if (!producto) return errorResponse(res, 'Producto no encontrado', 404);
    if (producto.stock < cantidad) return errorResponse(res, 'Stock insuficiente', 400);

    const usuarioId = req.user.documento;
    let carousel = memoriaCarritos.get(usuarioId) || [];

    const itemIndex = carousel.findIndex(item => item.productoId === parseInt(productoId));
    if (itemIndex === -1) return errorResponse(res, 'Producto no está en el carrito', 404);

    carousel[itemIndex].cantidad = cantidad;
    memoriaCarritos.set(usuarioId, carousel);

    return successResponse(res, { items: carousel }, 'Cantidad actualizada');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.eliminarItem = async (req, res) => {
  try {
    const { productoId } = req.params;
    const usuarioId = req.user.documento;
    let carousel = memoriaCarritos.get(usuarioId) || [];

    carousel = carousel.filter(item => item.productoId !== parseInt(productoId));
    memoriaCarritos.set(usuarioId, carousel);

    return successResponse(res, { items: carousel }, 'Producto eliminado del carrito');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.vaciarCarrito = async (req, res) => {
  try {
    const usuarioId = req.user.documento;
    memoriaCarritos.set(usuarioId, []);
    return successResponse(res, { items: [] }, 'Carrito vaciado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};