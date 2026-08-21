// Capa delgada: interpreta el request, llama al service, traduce el
// resultado (o el error) a una respuesta HTTP. Sin lógica de negocio aquí.
const service = require('./carrito.service');
const { successResponse, errorResponse } = require('../../utils/helpers');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.obtenerCarrito = async (req, res) => {
  try {
    const carrito = await service.obtenerCarrito(req.user.documento);
    return successResponse(res, carrito);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.agregarItem = async (req, res) => {
  try {
    const carrito = await service.agregarItem(req.user.documento, req.body);
    return successResponse(res, carrito, 'Producto agregado al carrito');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizarItem = async (req, res) => {
  try {
    const carrito = await service.actualizarItem(req.user.documento, req.params.productoId, req.body.cantidad);
    return successResponse(res, carrito, 'Cantidad actualizada');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminarItem = async (req, res) => {
  try {
    const carrito = await service.eliminarItem(req.user.documento, req.params.productoId);
    return successResponse(res, carrito, 'Producto eliminado del carrito');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.vaciarCarrito = async (req, res) => {
  try {
    const carrito = await service.vaciarCarrito(req.user.documento);
    return successResponse(res, carrito, 'Carrito vaciado');
  } catch (error) {
    return handleError(res, error);
  }
};
