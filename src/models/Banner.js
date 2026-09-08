const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  layout: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'single'
    // clave de la plantilla de collage: single | duo | trio | grid-4 | grid-6 | mosaic-8
  },
  images: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
    // [{ slot: number, url: string }] - una entrada por cada casilla de la plantilla.
    // Solo se usa (y se guarda a mano) cuando contentType = 'imagenes'; para los
    // demás tipos, banners.service.js la reconstruye en cada lectura a partir de
    // contentRefs y no depende de lo guardado aquí.
  },
  contentType: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'imagenes',
    field: 'content_type'
    // imagenes | productos | marcas | populares_marca | populares_categoria
  },
  contentRefs: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'content_refs'
    // productos/marcas: [id, id, ...] en el orden en que caen en cada casilla.
    // populares_marca/populares_categoria: { refId: <marcaId|categoriaId> } —
    // el límite de items lo da el número de casillas de la plantilla elegida.
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  texto: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  textPosition: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'none',
    field: 'text_position'
    // left | right | center | none
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  creadoPorDocumento: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'creado_por_documento'
  },
  creadoPorNombre: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'creado_por_nombre'
  }
}, {
  tableName: 'banners',
  timestamps: true
});

module.exports = Banner;
