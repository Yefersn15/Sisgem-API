const service = require('./usuarios.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.listar = async (req, res) => {
  try {
    const { estado, rol, search } = req.query;
    const pagination = getPagination(req);
    const { rows, count } = await service.listar({ estado, rol, search, pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.crear = async (req, res) => {
  try {
    const usuario = await service.crear(req.body, req.user);
    return successResponse(res, usuario, 'Usuario creado exitosamente', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetallePorDocumento = async (req, res) => {
  try {
    const usuario = await service.obtenerPorDocumento(req.params.documento);
    return successResponse(res, usuario);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const usuario = await service.obtenerPorId(req.params.id);
    return successResponse(res, usuario);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const usuario = await service.actualizar(req.params.id, req.body, req.user);
    return successResponse(res, usuario, 'Usuario actualizado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id, req.user);
    return successResponse(res, null, 'Usuario eliminado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const usuario = await service.cambiarEstado(req.params.id, req.body.estado, req.user);
    return successResponse(res, usuario, 'Estado actualizado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listarDirecciones = async (req, res) => {
  try {
    const direcciones = await service.listarDirecciones(req.user.documento);
    return successResponse(res, direcciones);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.agregarDireccion = async (req, res) => {
  try {
    const direcciones = await service.agregarDireccion(req.user.documento, req.body);
    return successResponse(res, direcciones, 'Dirección guardada exitosamente', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizarDireccion = async (req, res) => {
  try {
    const direcciones = await service.actualizarDireccion(req.user.documento, req.params.id, req.body);
    return successResponse(res, direcciones, 'Dirección actualizada exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminarDireccion = async (req, res) => {
  try {
    const direcciones = await service.eliminarDireccion(req.user.documento, req.params.id);
    return successResponse(res, direcciones, 'Dirección eliminada exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.direccionPredeterminada = async (req, res) => {
  try {
    const direcciones = await service.direccionPredeterminada(req.user.documento, req.params.id);
    return successResponse(res, direcciones, 'Dirección predeterminada actualizada');
  } catch (error) {
    return handleError(res, error);
  }
};
