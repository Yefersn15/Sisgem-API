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
    // [{ slot: number, url: string }] - una entrada por cada casilla de la plantilla
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
  }
}, {
  tableName: 'banners',
  timestamps: true
});

module.exports = Banner;
