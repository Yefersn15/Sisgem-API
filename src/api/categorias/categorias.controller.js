// Capa delgada: interpreta el request, llama al service, traduce el
// resultado (o el error) a una respuesta HTTP. Sin lógica de negocio aquí.
const service = require('./categorias.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.listar = async (req, res) => {
  try {
    const { estado } = req.query;
    const isStaff = req.user && ['ADMIN', 'EMPLEADO'].includes(req.user.rol);
    const pagination = getPagination(req);

    const { rows, count } = await service.listar({ isStaff, estado, pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.crear = async (req, res) => {
  try {
    const categoria = await service.crear(req.body);
    return successResponse(res, categoria, 'Categoría creada exitosamente', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const categoria = await service.obtenerPorId(req.params.id);
    return successResponse(res, categoria);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const categoria = await service.actualizar(req.params.id, req.body);
    return successResponse(res, categoria, 'Categoría actualizada exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id);
    return successResponse(res, null, 'Categoría eliminada exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const categoria = await service.cambiarEstado(req.params.id, req.body.estado);
    return successResponse(res, categoria, 'Estado actualizado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.exportar = async (req, res) => {
  try {
    const categorias = await service.exportar();
    return successResponse(res, categorias);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.importar = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 'No se ha proporcionado un archivo', 400);
    return errorResponse(res, 'Funcionalidad de importación en desarrollo', 501);
  } catch (error) {
    return handleError(res, error);
  }
};
