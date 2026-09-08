const service = require('./caja.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.abrir = async (req, res) => {
  try {
    const sesion = await service.abrir(req.user, req.body);
    return successResponse(res, sesion, 'Caja abierta', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actual = async (req, res) => {
  try {
    const data = await service.actual();
    return successResponse(res, data);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listar = async (req, res) => {
  try {
    const pagination = getPagination(req);
    const { rows, count } = await service.listar({ pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const sesion = await service.obtenerPorId(req.params.id);
    return successResponse(res, sesion);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cerrar = async (req, res) => {
  try {
    const sesion = await service.cerrar(req.params.id, req.user, req.body);
    return successResponse(res, sesion, 'Caja cerrada');
  } catch (error) {
    return handleError(res, error);
  }
};
