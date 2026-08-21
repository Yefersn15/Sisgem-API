// Capa delgada: interpreta el request, llama al service, traduce el
// resultado (o el error) a una respuesta HTTP. Sin lógica de negocio aquí.
const service = require('./roles.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.seedRoles = async (req, res) => {
  try {
    const { creados } = await service.seedRoles();
    if (creados) {
      return successResponse(res, null, 'Roles creados exitosamente', 201);
    }
    return successResponse(res, null, 'Los roles ya existen');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listar = async (req, res) => {
  try {
    const { estado } = req.query;
    const pagination = getPagination(req);
    const { rows, count } = await service.listar({ estado, pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.crear = async (req, res) => {
  try {
    const nuevoRol = await service.crear(req.body);
    return successResponse(res, nuevoRol, 'Rol creado exitosamente', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const rol = await service.obtenerPorId(req.params.id);
    return successResponse(res, rol);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verPorNombre = async (req, res) => {
  try {
    const rol = await service.obtenerPorNombre(req.params.nombre);
    return successResponse(res, rol);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const rol = await service.actualizar(req.params.id, req.body);
    return successResponse(res, rol, 'Rol actualizado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id);
    return successResponse(res, null, 'Rol eliminado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const rol = await service.cambiarEstado(req.params.id, req.body.estado);
    return successResponse(res, rol, 'Estado actualizado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.listarPermisos = async (req, res) => {
  return successResponse(res, service.listarPermisos());
};
