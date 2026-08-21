// Acceso a datos de banners: aísla las llamadas a Sequelize para que
// banners.service.js concentre únicamente lógica de negocio.
const { Banner } = require('../../models');

exports.findAndCountAll = ({ where, pagination }) =>
  Banner.findAndCountAll({
    where,
    order: [['displayOrder', 'ASC'], ['id', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset,
  });

exports.create = (data) => Banner.create(data);

exports.findById = (id) => Banner.findByPk(id);
