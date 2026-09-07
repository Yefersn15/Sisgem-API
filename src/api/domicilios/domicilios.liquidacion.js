// Liquidación de la entrega de un pedido a domicilio: genera el pago
// contraentrega que corresponda (contado o saldo restante de un abono),
// convierte el pedido en venta cuando queda completamente pagado, y
// descuenta el stock vendido. Vive aparte de domicilios.service.js porque
// es lógica de checkout/pagos que se dispara al marcar un domicilio como
// "entregado", no gestión del domicilio en sí.
const { Pedido, Pago, Producto } = require('../../models');
const AppError = require('../../utils/AppError');

exports.descontarStock = async (productos, t) => {
  const lista = Array.isArray(productos) ? productos : [];
  for (const item of lista) {
    const producto = await Producto.findByPk(item.producto, { transaction: t });
    if (producto) {
      const nuevoStock = producto.stock - item.cantidad;
      if (nuevoStock < 0) throw new AppError(`Stock insuficiente para producto ${producto.nombre}`, 400);
      await producto.update({ stock: nuevoStock }, { transaction: t });
    }
  }
};

// Al marcar un domicilio como "entregado": genera el pago contraentrega que
// corresponda (contado o saldo restante de un abono) y convierte el pedido
// en venta cuando queda completamente pagado.
exports.liquidarEntregaDePedido = async (pedido, t) => {
  if (!pedido) return;

  if (pedido.metodoPago !== 'Abono' && !pedido.esVenta) {
    await Pago.create({
      pedidoId: pedido.id,
      monto: pedido.total,
      metodo: 'Contraentrega',
      estado: 'aplicado',
      referencia: `Pago contraentrega - ${pedido.metodoPago}`,
      tipo: 'pago_total'
    }, { transaction: t });
    await Pedido.update({
      esVenta: true,
      estadoVenta: 'completada',
      estadoPedido: 'entregado',
      totalPagado: pedido.total
    }, { where: { id: pedido.id }, transaction: t });
  } else if (pedido.metodoPago === 'Abono') {
    if (!pedido.esVenta) {
      const saldoPendiente = parseFloat(pedido.total) - (parseFloat(pedido.totalPagado) || 0);
      if (saldoPendiente > 0) {
        await Pago.create({
          pedidoId: pedido.id,
          monto: saldoPendiente,
          metodo: 'Contraentrega',
          estado: 'aplicado',
          referencia: 'Pago automático al entregar domicilio',
          tipo: 'pago_total'
        }, { transaction: t });
        await pedido.update({ totalPagado: pedido.total, esVenta: true, estadoVenta: 'completada', estadoPedido: 'entregado' }, { transaction: t });
      } else {
        await pedido.update({ esVenta: true, estadoVenta: 'completada', estadoPedido: 'entregado' }, { transaction: t });
      }
    } else {
      await pedido.update({ estadoPedido: 'entregado' }, { transaction: t });
    }
  } else {
    await pedido.update({ estadoPedido: 'entregado' }, { transaction: t });
  }
};
