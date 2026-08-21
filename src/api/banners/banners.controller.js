// Capa delgada: interpreta el request, llama al service, traduce el
// resultado (o el error) a una respuesta HTTP. Sin lógica de negocio aquí.
const service = require('./banners.service');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { getPagination, paginatedResponse } = require('../../utils/pagination');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.listar = async (req, res) => {
  try {
    const isStaff = req.user && ['ADMIN', 'ADMINISTRADOR', 'EMPLEADO'].includes(req.user.rol);
    const pagination = getPagination(req);

    const { rows, count } = await service.listar({ isStaff, pagination });
    return paginatedResponse(res, { rows, count }, pagination);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.crear = async (req, res) => {
  try {
    const banner = await service.crear(req.body);
    return successResponse(res, banner, 'Banner creado exitosamente', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const banner = await service.actualizar(req.params.id, req.body);
    return successResponse(res, banner, 'Banner actualizado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id);
    return successResponse(res, null, 'Banner eliminado exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};
