// Lógica de negocio y acceso a datos de banners. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
const { Op } = require('sequelize');
const repository = require('./banners.repository');
const { Producto, Marca } = require('../../models');
const dashboardService = require('../dashboard/dashboard.service');
const AppError = require('../../utils/AppError');

const LAYOUT_SLOTS = {
  single: 1,
  duo: 2,
  trio: 3,
  'grid-4': 4,
  'grid-6': 6,
  'mosaic-8': 8,
};

const CONTENT_TYPES = ['imagenes', 'productos', 'marcas', 'populares_marca', 'populares_categoria'];

const validarBanner = ({ layout, images, textPosition, contentType, contentRefs }) => {
  if (!Object.prototype.hasOwnProperty.call(LAYOUT_SLOTS, layout)) {
    return `Plantilla "${layout}" no reconocida`;
  }
  const slots = LAYOUT_SLOTS[layout];

  if (contentType && !CONTENT_TYPES.includes(contentType)) {
    return `Tipo de contenido "${contentType}" no reconocido`;
  }

  if (!contentType || contentType === 'imagenes') {
    if (!Array.isArray(images) || images.length !== slots) {
      return `La plantilla "${layout}" requiere ${slots} imagen(es)`;
    }
    if (images.some((img) => !img || !img.url)) {
      return 'Todas las casillas de imagen deben tener una URL';
    }
  } else if (contentType === 'productos' || contentType === 'marcas') {
    if (!Array.isArray(contentRefs) || contentRefs.length === 0) {
      return `Selecciona al menos ${contentType === 'productos' ? 'un producto' : 'una marca'}`;
    }
    if (contentRefs.length > slots) {
      return `La plantilla "${layout}" admite máximo ${slots}`;
    }
  } else if (contentType === 'populares_marca' || contentType === 'populares_categoria') {
    if (!contentRefs || !contentRefs.refId) {
      return `Selecciona ${contentType === 'populares_marca' ? 'una marca' : 'una categoría'} de referencia`;
    }
  }

  if (textPosition && !['left', 'right', 'center', 'none'].includes(textPosition)) {
    return 'Posición de texto inválida';
  }
  return null;
};

// Para contentType !== 'imagenes', las casillas no se guardan a mano: se
// recalculan en cada lectura a partir de contentRefs, para que un banner de
// "populares" siempre refleje las ventas actuales sin que el admin tenga que
// volver a editarlo.
const resolverContenido = async ({ contentType, contentRefs, images }) => {
  if (!contentType || contentType === 'imagenes') return images || [];

  if (contentType === 'productos') {
    const ids = Array.isArray(contentRefs) ? contentRefs : [];
    const productos = await Producto.findAll({ where: { id: { [Op.in]: ids } } });
    const porId = new Map(productos.map((p) => [String(p.id), p]));
    return ids
      .map((id, i) => {
        const p = porId.get(String(id));
        if (!p) return null;
        return { slot: i, url: p.imagen || '', nombre: p.nombre, precio: p.precio, refId: p.id };
      })
      .filter(Boolean);
  }

  if (contentType === 'marcas') {
    const ids = Array.isArray(contentRefs) ? contentRefs : [];
    const marcas = await Marca.findAll({ where: { id: { [Op.in]: ids } } });
    const porId = new Map(marcas.map((m) => [String(m.id), m]));
    return ids
      .map((id, i) => {
        const m = porId.get(String(id));
        if (!m) return null;
        return { slot: i, url: m.logo || '', nombre: m.nombre, refId: m.id };
      })
      .filter(Boolean);
  }

  if (contentType === 'populares_marca' || contentType === 'populares_categoria') {
    const { refId, limit } = contentRefs || {};
    if (!refId) return [];
    const ranking = contentType === 'populares_marca'
      ? await dashboardService.productosMasVendidosPorMarca(refId, limit || 8)
      : await dashboardService.productosMasVendidosPorCategoria(refId, limit || 8);

    const ids = ranking.map((r) => r.productoId);
    const productos = await Producto.findAll({ where: { id: { [Op.in]: ids } } });
    const porId = new Map(productos.map((p) => [String(p.id), p]));
    return ranking
      .map((r, i) => {
        const p = porId.get(String(r.productoId));
        if (!p) return null;
        return { slot: i, url: p.imagen || '', nombre: p.nombre, precio: p.precio, refId: p.id };
      })
      .filter(Boolean);
  }

  return images || [];
};

exports.listar = async ({ isStaff, pagination }) => {
  const where = isStaff ? {} : { estado: true };

  const { rows, count } = await repository.findAndCountAll({ where, pagination });
  const resueltos = await Promise.all(
    rows.map(async (banner) => {
      const plano = banner.toJSON();
      plano.images = await resolverContenido(plano);
      return plano;
    })
  );

  return { rows: resueltos, count };
};

exports.crear = async (data) => {
  const { layout, images, titulo, texto, textPosition, displayOrder, estado, contentType, contentRefs } = data;

  const errorValidacion = validarBanner({ layout, images, textPosition, contentType, contentRefs });
  if (errorValidacion) throw new AppError(errorValidacion, 400);

  return repository.create({
    layout,
    images: !contentType || contentType === 'imagenes' ? images : [],
    contentType: contentType || 'imagenes',
    contentRefs: contentType && contentType !== 'imagenes' ? contentRefs : null,
    titulo,
    texto,
    textPosition: textPosition || 'none',
    displayOrder: displayOrder || 0,
    estado: estado !== undefined ? estado : true,
  });
};

exports.actualizar = async (id, data) => {
  const { layout, images, titulo, texto, textPosition, displayOrder, estado, contentType, contentRefs } = data;

  const banner = await repository.findById(id);
  if (!banner) throw new AppError('Banner no encontrado', 404);

  const nextLayout = layout || banner.layout;
  const nextContentType = contentType || banner.contentType;
  const nextImages = images !== undefined ? images : banner.images;
  const nextContentRefs = contentRefs !== undefined ? contentRefs : banner.contentRefs;

  const errorValidacion = validarBanner({ layout: nextLayout, images: nextImages, textPosition, contentType: nextContentType, contentRefs: nextContentRefs });
  if (errorValidacion) throw new AppError(errorValidacion, 400);

  await banner.update({
    layout: nextLayout,
    images: nextContentType === 'imagenes' ? nextImages : [],
    contentType: nextContentType,
    contentRefs: nextContentType !== 'imagenes' ? nextContentRefs : null,
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
