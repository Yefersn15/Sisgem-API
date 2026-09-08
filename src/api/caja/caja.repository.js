// Acceso a datos de caja: aísla las llamadas a Sequelize sobre CajaSesion.
const { CajaSesion } = require('../../models');

exports.findAbierta = () => CajaSesion.findOne({ where: { estado: 'abierta' } });

exports.create = (data) => CajaSesion.create(data);

exports.findById = (id) => CajaSesion.findByPk(id);

exports.findAndCountAll = ({ pagination }) =>
  CajaSesion.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
  });
