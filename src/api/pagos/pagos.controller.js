const service = require('./pagos.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.listar = async (req, res) => {
  try {
    const { pedido, estado, metodo } = req.query;
    const isStaff = req.user && ['ADMIN', 'EMPLEADO'].includes(req.user.rol);
    const pagination = getPagination(req);
    const { rows, count } = await service.listar({ isStaff, documento: req.user.documento, pedido, estado, metodo, pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.crear = async (req, res) => {
  try {
    const pago = await service.crear(req.body, req.user);
    return successResponse(res, pago, 'Pago registrado', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const pago = await service.obtenerPorId(req.params.id);
    return successResponse(res, pago);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const pago = await service.actualizar(req.params.id, req.body, req.user);
    return successResponse(res, pago, 'Pago actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const pago = await service.cambiarEstado(req.params.id, req.body.estado, req.user);
    return successResponse(res, pago, 'Estado actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.misPagos = async (req, res) => {
  try {
    const pagos = await service.misPagos(req.user.documento);
    return successResponse(res, pagos);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id, req.user);
    return successResponse(res, null, 'Pago eliminado');
  } catch (error) {
    return handleError(res, error);
  }
};
