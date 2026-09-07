const service = require('./configuracion.service');
const { successResponse, errorResponse } = require('../../utils/helpers');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.obtener = async (req, res) => {
  try {
    const config = await service.obtener();
    return successResponse(res, config);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const config = await service.actualizar(req.body);
    return successResponse(res, config, 'Configuración actualizada exitosamente');
  } catch (error) {
    return handleError(res, error);
  }
};
