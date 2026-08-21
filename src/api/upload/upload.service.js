// Lógica de negocio y acceso a datos de subida de imágenes (Cloudinary).
// No conoce Express (nada de req/res) — el controlador es quien traduce
// esto a HTTP.
const cloudinary = require('../../config/cloudinary');
const AppError = require('../../utils/AppError');

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

exports.subirImagen = async (file, { folder, maxWidth } = {}) => {
  if (!file) throw new AppError('No se proporcionó ninguna imagen', 400);
  if (!file.mimetype.startsWith('image/')) throw new AppError('El archivo debe ser una imagen', 400);

  const resolvedFolder = resolveFolder(folder);
  const resolvedMaxWidth = resolveMaxWidth(maxWidth);

  const result = await streamUpload(file.buffer, resolvedFolder, resolvedMaxWidth);

  return { url: result.secure_url, publicId: result.public_id };
};

exports.listarImagenes = async (folder) => {
  const resolvedFolder = resolveFolder(folder);

  const result = await cloudinary.api.resources({
    type: 'upload',
    resource_type: 'image',
    prefix: `sisgem/${resolvedFolder}/`,
    max_results: 100
  });

  return (result.resources || [])
    .map((r) => ({
      publicId: r.public_id,
      url: r.secure_url,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      createdAt: r.created_at
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

exports.eliminarImagen = async (publicId) => {
  if (!publicId) throw new AppError('publicId requerido', 400);
  await cloudinary.uploader.destroy(publicId);
};
