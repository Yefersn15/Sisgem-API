// Capa delgada: interpreta el request, llama al service, traduce el
// resultado (o el error) a una respuesta HTTP. Sin lógica de negocio aquí.
const service = require('./upload.service');
const { successResponse, errorResponse } = require('../../utils/helpers');

const handleError = (res, error, logLabel, defaultMessage) => {
  console.error(logLabel, error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message || defaultMessage, statusCode);
};

exports.subirImagen = async (req, res) => {
  try {
    const resultado = await service.subirImagen(req.file, { folder: req.body?.folder, maxWidth: req.body?.maxWidth });
    return successResponse(res, resultado, 'Imagen subida exitosamente', 201);
  } catch (error) {
    return handleError(res, error, 'Error subiendo imagen a Cloudinary:', 'Error al subir la imagen');
  }
};

exports.listarImagenes = async (req, res) => {
  try {
    const imagenes = await service.listarImagenes(req.query.folder);
    return successResponse(res, imagenes);
  } catch (error) {
    return handleError(res, error, 'Error listando imágenes de Cloudinary:', 'Error al listar imágenes');
  }
};

exports.eliminarImagen = async (req, res) => {
  try {
    await service.eliminarImagen(req.body?.publicId);
    return successResponse(res, null, 'Imagen eliminada exitosamente');
  } catch (error) {
    return handleError(res, error, 'Error eliminando imagen de Cloudinary:', 'Error al eliminar la imagen');
  }
};
