const service = require('./domicilios.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.listar = async (req, res) => {
  try {
    const { estado, pedido } = req.query;
    const pagination = getPagination(req);
    const { rows, count } = await service.listar({ estado, pedido, pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.crear = async (req, res) => {
  try {
    const domicilio = await service.crear(req.body);
    return successResponse(res, domicilio, 'Domicilio creado', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const domicilio = await service.obtenerPorId(req.params.id);
    return successResponse(res, domicilio);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const domicilio = await service.cambiarEstado(req.params.id, req.body);
    return successResponse(res, domicilio, 'Estado actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.asignarRepartidor = async (req, res) => {
  try {
    const domicilio = await service.asignarRepartidor(req.params.id, req.body);
    return successResponse(res, domicilio, 'Repartidor asignado/actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.porCliente = async (req, res) => {
  try {
    const domicilios = await service.porCliente(req.params.usuarioId);
    return successResponse(res, domicilios);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.misDomicilios = async (req, res) => {
  try {
    const domicilios = await service.misDomicilios(req.user.documento);
    return successResponse(res, domicilios);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.misPedidosDomicilio = async (req, res) => {
  try {
    const domicilios = await service.misPedidosDomicilio(req.user.documento);
    return successResponse(res, domicilios);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const domicilio = await service.actualizar(req.params.id, req.body);
    return successResponse(res, domicilio, 'Domicilio actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizarTarifa = async (req, res) => {
  try {
    const domicilio = await service.actualizarTarifa(req.params.id, req.body.tarifa);
    return successResponse(res, domicilio, 'Tarifa actualizada');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listarTarifas = async (req, res) => {
  try {
    const tarifas = await service.listarTarifas();
    return successResponse(res, tarifas);
  } catch (error) {
    return handleError(res, error);
  }
};

// Funcionalidad de plantillas de tarifas: no implementada (igual que antes de la migración).
exports.crearTarifa = async (req, res) => errorResponse(res, 'Funcionalidad de tarifas no implementada', 501);
exports.actualizarTarifaTemplate = async (req, res) => errorResponse(res, 'Funcionalidad de tarifas no implementada', 501);
exports.eliminarTarifaTemplate = async (req, res) => errorResponse(res, 'Funcionalidad de tarifas no implementada', 501);

exports.cambiarEstadoRepartidor = async (req, res) => {
  try {
    const domicilio = await service.cambiarEstadoRepartidor(req.params.id, req.body.estado, req.user.documento);
    return successResponse(res, domicilio, 'Estado actualizado');
  } catch (error) {
    return handleError(res, error);
  }
};
