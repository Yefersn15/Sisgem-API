const service = require('./pedidos.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.crear = async (req, res) => {
  try {
    const pedido = await service.crear(req.user.documento, req.body);
    return successResponse(res, pedido, 'Pedido creado', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cambiarEstadoPedido = async (req, res) => {
  try {
    const pedido = await service.cambiarEstadoPedido(req.params.id, req.body.estado_pedido);
    return successResponse(res, pedido, 'Estado actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listarPedidos = async (req, res) => {
  try {
    const { estado } = req.query;
    const pagination = getPagination(req);
    const { rows, count } = await service.listarPedidos({ estado, pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listarVentas = async (req, res) => {
  try {
    const pagination = getPagination(req);
    const { rows, count } = await service.listarVentas({ pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.misPedidos = async (req, res) => {
  try {
    const pedidos = await service.misPedidos(req.user.documento);
    return successResponse(res, pedidos);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const pedido = await service.verDetalle(req.params.id, req.user);
    return successResponse(res, pedido);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.aprobarAbono = async (req, res) => {
  try {
    const pedido = await service.aprobarAbono(req.params.id);
    return successResponse(res, pedido, 'Pedido aprobado - flujo de domicilio');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.convertirAVenta = async (req, res) => {
  try {
    const pedido = await service.convertirAVenta(req.params.id);
    return successResponse(res, pedido, 'Convertido a venta');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const pedido = await service.actualizar(req.params.id, req.body);
    return successResponse(res, pedido, 'Pedido actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id);
    return successResponse(res, null, 'Pedido eliminado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cancelar = async (req, res) => {
  try {
    const pedido = await service.cancelar(req.params.id);
    return successResponse(res, pedido, 'Pedido cancelado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.aprobarPedido = async (req, res) => {
  try {
    const pedido = await service.aprobarPedido(req.params.id);
    return successResponse(res, pedido, 'Pedido aprobado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.rechazarAbono = async (req, res) => {
  try {
    const pedido = await service.rechazarAbono(req.params.id, req.body.motivo);
    return successResponse(res, pedido, 'Abono rechazado');
  } catch (error) {
    return handleError(res, error);
  }
};
