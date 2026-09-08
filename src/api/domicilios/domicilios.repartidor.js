// Asignación de repartidor a un domicilio: resuelve los datos del
// repartidor a partir de varias formas de entrada posibles (objeto, string
// suelto, o lookup por repartidorId contra Usuario) y aplica la tarifa.
// Vive aparte de domicilios.service.js porque es un flujo autocontenido con
// su propia lógica de normalización de datos, no gestión general del
// domicilio.
const { Pedido, Usuario, sequelize } = require('../../models');
const repository = require('./domicilios.repository');
const AppError = require('../../utils/AppError');

exports.asignarRepartidor = async (id, data, requester) => {
  const { repartidor, repartidorId, tarifa, telefono, tipoVehiculo, placa, nombre } = data;
  const t = await sequelize.transaction();

  try {
    let domicilio = await repository.findById(id, { transaction: t });
    if (!domicilio) {
      domicilio = await repository.findByPedidoId(id, { transaction: t });
    }
    if (!domicilio) throw new AppError('Domicilio no encontrado', 404);

    const pedido = await Pedido.findByPk(domicilio.pedidoId, { transaction: t });
    if (!pedido) throw new AppError('Pedido asociado no encontrado', 404);

    const estadoPedido = String(pedido.estadoPedido || '').toLowerCase();
    if (estadoPedido === 'pendiente') throw new AppError('No se puede asignar repartidor a un pedido en estado Pendiente', 400);
    if (['entregado', 'cancelado', 'anulado'].includes(estadoPedido)) {
      throw new AppError(`No se puede asignar repartidor a un pedido en estado ${pedido.estadoPedido}`, 400);
    }

    let repartidorObj = { nombre: '', telefono: '', tipoVehiculo: '', placa: '' };
    if (repartidor && typeof repartidor === 'object') {
      repartidorObj = { nombre: repartidor.nombre || '', telefono: repartidor.telefono || '', tipoVehiculo: repartidor.tipoVehiculo || '', placa: repartidor.placa || '' };
    } else if (repartidor && typeof repartidor === 'string') {
      repartidorObj.nombre = repartidor;
      repartidorObj.telefono = telefono || '';
    } else if (nombre) {
      repartidorObj = { nombre, telefono: telefono || '', tipoVehiculo: tipoVehiculo || '', placa: placa || '' };
    }

    if (repartidorId) {
      const user = await Usuario.findByPk(repartidorId, { transaction: t });
      if (user) {
        repartidorObj.nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim();
        repartidorObj.telefono = user.telefono || repartidorObj.telefono;
        repartidorObj.tipoVehiculo = user.tipoVehiculo || repartidorObj.tipoVehiculo;
        repartidorObj.placa = user.placa || repartidorObj.placa;
      }
    }

    const updateData = {
      repartidor: repartidorObj,
      repartidorId: repartidorId || null,
      fechaAsignacion: new Date(),
      gestionadoPorDocumento: requester?.documento || null,
      gestionadoPorNombre: requester?.nombre || null,
    };
    if (tarifa !== undefined && tarifa !== null) {
      const tarifaNum = parseFloat(String(tarifa).replace(/[^0-9.-]/g, ''));
      if (!isNaN(tarifaNum)) {
        updateData.costo = tarifaNum;
        updateData.tarifaAplicada = tarifaNum;
        const nuevoTotal = (parseFloat(pedido.subtotal) || 0) + tarifaNum;
        await pedido.update({ total: nuevoTotal }, { transaction: t });
      }
    }

    await repository.updateById(domicilio.id, updateData, { transaction: t });

    if (['Pendiente', 'aprobado'].includes(domicilio.estado)) {
      await repository.updateById(domicilio.id, { estado: 'asignado' }, { transaction: t });
    }
    if (['Pendiente', 'aprobado'].includes(pedido.estadoPedido)) {
      await Pedido.update({ estadoPedido: 'asignado' }, { where: { id: domicilio.pedidoId }, transaction: t });
    }

    await t.commit();
    return repository.findByIdConPedido(domicilio.id);
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
