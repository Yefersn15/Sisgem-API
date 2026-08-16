const cloudinary = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/helpers');

const FOLDER_PATTERN = /^[a-z0-9_-]+$/i;

const streamUpload = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `sisgem/${folder}`,
        resource_type: 'image',
        // Limita el ancho máximo y sirve el formato/calidad más liviano soportado
        // por el navegador (WebP/AVIF cuando aplica) para optimizar espacio.
        transformation: [
          { width: 1600, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

exports.subirImagen = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No se proporcionó ninguna imagen', 400);
    }
    if (!req.file.mimetype.startsWith('image/')) {
      return errorResponse(res, 'El archivo debe ser una imagen', 400);
    }

    const folderInput = (req.body.folder || 'general').trim();
    const folder = FOLDER_PATTERN.test(folderInput) ? folderInput : 'general';

    const result = await streamUpload(req.file.buffer, folder);

    return successResponse(res, {
      url: result.secure_url,
      publicId: result.public_id
    }, 'Imagen subida exitosamente', 201);
  } catch (error) {
    console.error('Error subiendo imagen a Cloudinary:', error);
    return errorResponse(res, error.message || 'Error al subir la imagen');
  }
};

exports.eliminarImagen = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return errorResponse(res, 'publicId requerido', 400);
    }
    await cloudinary.uploader.destroy(publicId);
    return successResponse(res, null, 'Imagen eliminada exitosamente');
  } catch (error) {
    console.error('Error eliminando imagen de Cloudinary:', error);
    return errorResponse(res, error.message || 'Error al eliminar la imagen');
  }
};
