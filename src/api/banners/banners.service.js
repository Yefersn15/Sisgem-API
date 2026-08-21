// Lógica de negocio y acceso a datos de banners. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
const repository = require('./banners.repository');
const AppError = require('../../utils/AppError');

const LAYOUT_SLOTS = {
  single: 1,
  duo: 2,
  trio: 3,
  'grid-4': 4,
  'grid-6': 6,
  'mosaic-8': 8,
};

const validarBanner = ({ layout, images, textPosition }) => {
  if (!Object.prototype.hasOwnProperty.call(LAYOUT_SLOTS, layout)) {
    return `Plantilla "${layout}" no reconocida`;
  }
  const slots = LAYOUT_SLOTS[layout];
  if (!Array.isArray(images) || images.length !== slots) {
    return `La plantilla "${layout}" requiere ${slots} imagen(es)`;
  }
  if (images.some((img) => !img || !img.url)) {
    return 'Todas las casillas de imagen deben tener una URL';
  }
  if (textPosition && !['left', 'right', 'center', 'none'].includes(textPosition)) {
    return 'Posición de texto inválida';
  }
  return null;
};

exports.listar = async ({ isStaff, pagination }) => {
  const where = isStaff ? {} : { estado: true };

  return repository.findAndCountAll({ where, pagination });
};

exports.crear = async (data) => {
  const { layout, images, titulo, texto, textPosition, displayOrder, estado } = data;

  const errorValidacion = validarBanner({ layout, images, textPosition });
  if (errorValidacion) throw new AppError(errorValidacion, 400);

  return repository.create({
    layout,
    images,
    titulo,
    texto,
    textPosition: textPosition || 'none',
    displayOrder: displayOrder || 0,
    estado: estado !== undefined ? estado : true,
  });
};

exports.actualizar = async (id, data) => {
  const { layout, images, titulo, texto, textPosition, displayOrder, estado } = data;

  const banner = await repository.findById(id);
  if (!banner) throw new AppError('Banner no encontrado', 404);

  const nextLayout = layout || banner.layout;
  const nextImages = images !== undefined ? images : banner.images;
  const errorValidacion = validarBanner({ layout: nextLayout, images: nextImages, textPosition });
  if (errorValidacion) throw new AppError(errorValidacion, 400);

  await banner.update({
    layout: nextLayout,
    images: nextImages,
    titulo: titulo !== undefined ? titulo : banner.titulo,
    texto: texto !== undefined ? texto : banner.texto,
    textPosition: textPosition || banner.textPosition,
    displayOrder: displayOrder !== undefined ? displayOrder : banner.displayOrder,
    estado: estado !== undefined ? estado : banner.estado,
  });

  return banner;
};

exports.eliminar = async (id) => {
  const banner = await repository.findById(id);
  if (!banner) throw new AppError('Banner no encontrado', 404);
  await banner.destroy();
};

exports.LAYOUT_SLOTS = LAYOUT_SLOTS;
