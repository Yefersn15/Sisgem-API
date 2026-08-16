const cloudinary = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/helpers');

const FOLDER_PATTERN = /^[a-z0-9_-]+$/i;
const DEFAULT_MAX_WIDTH = 1600;
const MIN_MAX_WIDTH = 200;
const MAX_MAX_WIDTH = 2000;

const resolveMaxWidth = (value) => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return DEFAULT_MAX_WIDTH;
  return Math.min(MAX_MAX_WIDTH, Math.max(MIN_MAX_WIDTH, parsed));
};

const resolveFolder = (value) => {
  const folderInput = (value || 'general').trim();
  return FOLDER_PATTERN.test(folderInput) ? folderInput : 'general';
};

const streamUpload = (buffer, folder, maxWidth) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `sisgem/${folder}`,
        resource_type: 'image',
        // Limita el ancho máximo (según dónde se vaya a mostrar) y sirve el
        // formato/calidad más liviano soportado por el navegador (WebP/AVIF
        // cuando aplica) para optimizar espacio.
        transformation: [
          { width: maxWidth, crop: 'limit' },
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

    const folder = resolveFolder(req.body.folder);
    const maxWidth = resolveMaxWidth(req.body.maxWidth);

    const result = await streamUpload(req.file.buffer, folder, maxWidth);

    return successResponse(res, {
      url: result.secure_url,
      publicId: result.public_id
    }, 'Imagen subida exitosamente', 201);
  } catch (error) {
    console.error('Error subiendo imagen a Cloudinary:', error);
    return errorResponse(res, error.message || 'Error al subir la imagen');
  }
};

exports.listarImagenes = async (req, res) => {
  try {
    const folder = resolveFolder(req.query.folder);

    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      prefix: `sisgem/${folder}/`,
      max_results: 100
    });

    const imagenes = (result.resources || [])
      .map(r => ({
        publicId: r.public_id,
        url: r.secure_url,
        width: r.width,
        height: r.height,
        bytes: r.bytes,
        createdAt: r.created_at
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return successResponse(res, imagenes);
  } catch (error) {
    console.error('Error listando imágenes de Cloudinary:', error);
    return errorResponse(res, error.message || 'Error al listar imágenes');
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
