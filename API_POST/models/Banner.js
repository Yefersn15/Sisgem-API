const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  imageData: {
    type: DataTypes.BLOB,
    allowNull: true
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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