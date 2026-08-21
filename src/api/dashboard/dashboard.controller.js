// Capa delgada: interpreta el request, llama al service, traduce el
// resultado (o el error) a una respuesta HTTP. Sin lógica de negocio aquí.
const service = require('./dashboard.service');
const { successResponse, errorResponse } = require('../../utils/helpers');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.ventasDia = async (req, res) => {
  try {
    const resumen = await service.ventasDia();
    return successResponse(res, resumen);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.ventasSemana = async (req, res) => {
  try {
    const resumen = await service.ventasSemana();
    return successResponse(res, resumen);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.ventasMes = async (req, res) => {
  try {
    const resumen = await service.ventasMes();
    return successResponse(res, resumen);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.productosMasVendidos = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const ranking = await service.productosMasVendidos(limit);
    return successResponse(res, ranking);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.stockBajo = async (req, res) => {
  try {
    const productos = await service.stockBajo();
    return successResponse(res, productos);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.pedidosPendientes = async (req, res) => {
  try {
    const pedidos = await service.pedidosPendientes();
    return successResponse(res, pedidos);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.ventasPorCliente = async (req, res) => {
  try {
    const ranking = await service.ventasPorCliente();
    return successResponse(res, ranking);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.domiciliosEficiencia = async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const eficiencia = await service.domiciliosEficiencia(dias);
    return successResponse(res, eficiencia);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.index = async (req, res) => {
  try {
    const resumen = await service.resumen();
    return successResponse(res, resumen);
  } catch (error) {
    return handleError(res, error);
  }
};
