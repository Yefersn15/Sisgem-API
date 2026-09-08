// Lógica de negocio de caja. No conoce Express.
const { Op } = require('sequelize');
const { Pedido, Pago, Domicilio } = require('../../models');
const repository = require('./caja.repository');
const AppError = require('../../utils/AppError');

// Mismos estados que pagos.service.js considera "el pedido ya no cuenta"
// (rechazado/cancelado/anulado): un pedido en esos estados no representa
// dinero que de verdad entró a la caja.
const ESTADOS_PEDIDO_EXCLUIDOS = ['rechazado', 'cancelado', 'anulado'];

const sumarPorMetodo = (registros, campoMonto, campoMetodo) => {
  const totales = {};
  let total = 0;
  for (const r of registros) {
    const metodo = r[campoMetodo] || 'Sin especificar';
    const monto = parseFloat(r[campoMonto]) || 0;
    totales[metodo] = (totales[metodo] || 0) + monto;
    total += monto;
  }
  return { porMetodo: totales, total };
};

// Calcula el resumen de un turno (desde que se abrió hasta el momento del
// cierre, o "ahora" para la vista previa de una caja aún abierta): ventas de
// contado y abonos agrupados por método de pago, domicilios entregados, y el
// efectivo esperado a partir del monto inicial + lo cobrado en efectivo.
const calcularResumen = async (montoInicial, fechaInicio, fechaFin) => {
  const rangoFechas = { [Op.gte]: fechaInicio, [Op.lte]: fechaFin };

  const pedidos = await Pedido.findAll({
    where: {
      createdAt: rangoFechas,
      estadoPedido: { [Op.notIn]: ESTADOS_PEDIDO_EXCLUIDOS },
    },
    attributes: ['id', 'total', 'metodoPago'],
  });
  const ventas = sumarPorMetodo(pedidos, 'total', 'metodoPago');

  const pagos = await Pago.findAll({
    where: { estado: 'aplicado', createdAt: rangoFechas },
    attributes: ['id', 'monto', 'metodo'],
  });
  const abonos = sumarPorMetodo(pagos, 'monto', 'metodo');

  const domiciliosEntregados = await Domicilio.findAll({
    where: { estado: 'entregado', fechaAsignacion: rangoFechas },
    attributes: ['id', 'tarifaAplicada'],
  });
  const totalTarifasDomicilio = domiciliosEntregados.reduce((sum, d) => sum + (parseFloat(d.tarifaAplicada) || 0), 0);

  const efectivoVentas = ventas.porMetodo['Efectivo'] || 0;
  const efectivoAbonos = abonos.porMetodo['Efectivo'] || 0;
  const efectivoEsperado = parseFloat(montoInicial) + efectivoVentas + efectivoAbonos;

  return {
    ventas: { porMetodo: ventas.porMetodo, total: ventas.total, cantidad: pedidos.length },
    abonos: { porMetodo: abonos.porMetodo, total: abonos.total, cantidad: pagos.length },
    domicilios: { cantidad: domiciliosEntregados.length, totalTarifas: totalTarifasDomicilio },
    efectivoVentas,
    efectivoAbonos,
    montoInicial: parseFloat(montoInicial),
    efectivoEsperado,
  };
};

exports.abrir = async (requester, { montoInicial, notas }) => {
  const abierta = await repository.findAbierta();
  if (abierta) {
    throw new AppError('Ya hay una caja abierta. Ciérrala antes de abrir una nueva.', 400);
  }

  return repository.create({
    abiertoPorDocumento: requester.documento,
    abiertoPorNombre: requester.nombre || null,
    montoInicial: montoInicial || 0,
    notasApertura: notas || null,
    estado: 'abierta',
  });
};

exports.actual = async () => {
  const sesion = await repository.findAbierta();
  if (!sesion) return null;

  const resumen = await calcularResumen(sesion.montoInicial, sesion.createdAt, new Date());
  return { sesion, resumen };
};

exports.listar = async ({ pagination }) => repository.findAndCountAll({ pagination });

exports.obtenerPorId = async (id) => {
  const sesion = await repository.findById(id);
  if (!sesion) throw new AppError('Sesión de caja no encontrada', 404);
  return sesion;
};

exports.cerrar = async (id, requester, { montoContado, notas }) => {
  const sesion = await repository.findById(id);
  if (!sesion) throw new AppError('Sesión de caja no encontrada', 404);
  if (sesion.estado !== 'abierta') throw new AppError('Esta caja ya está cerrada', 400);

  const fechaCierre = new Date();
  const resumen = await calcularResumen(sesion.montoInicial, sesion.createdAt, fechaCierre);
  const diferencia = parseFloat(montoContado) - resumen.efectivoEsperado;

  await sesion.update({
    estado: 'cerrada',
    fechaCierre,
    montoContado,
    notasCierre: notas || null,
    cerradoPorDocumento: requester.documento,
    cerradoPorNombre: requester.nombre || null,
    resumenCierre: { ...resumen, montoContado: parseFloat(montoContado), diferencia },
  });

  return sesion;
};
