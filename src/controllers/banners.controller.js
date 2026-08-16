const { Banner } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const LAYOUT_SLOTS = {
  single: 1,
  duo: 2,
  trio: 3,
  'grid-4': 4,
  'grid-6': 6,
  'mosaic-8': 8
};

const validarBanner = ({ layout, images, textPosition }) => {
  if (!Object.prototype.hasOwnProperty.call(LAYOUT_SLOTS, layout)) {
    return `Plantilla "${layout}" no reconocida`;
  }
  const slots = LAYOUT_SLOTS[layout];
  if (!Array.isArray(images) || images.length !== slots) {
    return `La plantilla "${layout}" requiere ${slots} imagen(es)`;
  }
  if (images.some(img => !img || !img.url)) {
    return 'Todas las casillas de imagen deben tener una URL';
  }
  if (textPosition && !['left', 'right', 'center', 'none'].includes(textPosition)) {
    return 'Posición de texto inválida';
  }
  return null;
};

exports.listar = async (req, res) => {
  try {
    const isStaff = req.user && ['ADMIN', 'ADMINISTRADOR', 'EMPLEADO'].includes(req.user.rol);
    const where = isStaff ? {} : { estado: true };

    const banners = await Banner.findAll({
      where,
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });
    return successResponse(res, banners);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  try {
    const { layout, images, titulo, texto, textPosition, displayOrder, estado } = req.body;

    const errorValidacion = validarBanner({ layout, images, textPosition });
    if (errorValidacion) {
      return errorResponse(res, errorValidacion, 400);
    }

    const banner = await Banner.create({
      layout,
      images,
      titulo,
      texto,
      textPosition: textPosition || 'none',
      displayOrder: displayOrder || 0,
      estado: estado !== undefined ? estado : true
    });

    return successResponse(res, banner, 'Banner creado exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { layout, images, titulo, texto, textPosition, displayOrder, estado } = req.body;

    const banner = await Banner.findByPk(id);
    if (!banner) {
      return errorResponse(res, 'Banner no encontrado', 404);
    }

    const nextLayout = layout || banner.layout;
    const nextImages = images !== undefined ? images : banner.images;
    const errorValidacion = validarBanner({ layout: nextLayout, images: nextImages, textPosition });
    if (errorValidacion) {
      return errorResponse(res, errorValidacion, 400);
    }

    await banner.update({
      layout: nextLayout,
      images: nextImages,
      titulo: titulo !== undefined ? titulo : banner.titulo,
      texto: texto !== undefined ? texto : banner.texto,
      textPosition: textPosition || banner.textPosition,
      displayOrder: displayOrder !== undefined ? displayOrder : banner.displayOrder,
      estado: estado !== undefined ? estado : banner.estado
    });

    return successResponse(res, banner, 'Banner actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByPk(id);
    if (!banner) {
      return errorResponse(res, 'Banner no encontrado', 404);
    }

    await banner.destroy();

    return successResponse(res, null, 'Banner eliminado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.LAYOUT_SLOTS = LAYOUT_SLOTS;
