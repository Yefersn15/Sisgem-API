const { Pedido, Producto, Usuario, Domicilio, Rol, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { Op } = require('sequelize');

exports.ventasDia = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    
    const pedidos = await Pedido.findAll({
      where: {
        createdAt: { [Op.between]: [hoy, mañana] },
        estadoPedido: { [Op.notIn]: ['cancelado', 'anulado'] }
      }
    });
    
    const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    const cantidadPedidos = pedidos.length;
    
    return successResponse(res, {
      totalVentas,
      cantidadPedidos,
      promedioVenta: cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.ventasSemana = async (req, res) => {
  try {
    const hoy = new Date();
    const haceUnaSemana = new Date(hoy);
    haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
    
    const pedidos = await Pedido.findAll({
      where: {
        createdAt: { [Op.between]: [haceUnaSemana, hoy] },
        estadoPedido: { [Op.notIn]: ['cancelado', 'anulado'] }
      }
    });
    
    const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    const cantidadPedidos = pedidos.length;
    
    return successResponse(res, {
      totalVentas,
      cantidadPedidos,
      promedioVenta: cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.ventasMes = async (req, res) => {
  try {
    const hoy = new Date();
    const haceUnMes = new Date(hoy);
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    
    const pedidos = await Pedido.findAll({
      where: {
        createdAt: { [Op.between]: [haceUnMes, hoy] },
        estadoPedido: { [Op.notIn]: ['cancelado', 'anulado'] }
      }
    });
    
    const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    const cantidadPedidos = pedidos.length;
    
    return successResponse(res, {
      totalVentas,
      cantidadPedidos,
      promedioVenta: cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.productosMasVendidos = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const pedidos = await Pedido.findAll({
      where: { estadoPedido: { [Op.notIn]: ['cancelado'] } }
    });
    
    const productosContados = {};
    pedidos.forEach(pedido => {
      const productos = pedido.productos || [];
      productos.forEach(item => {
        const productoId = item.producto;
        if (!productosContados[productoId]) {
          productosContados[productoId] = {
            productoId,
            cantidad: 0,
            totalVendido: 0
          };
        }
        productosContados[productoId].cantidad += item.cantidad;
        productosContados[productoId].totalVendido += item.subtotal;
      });
    });
    
    const ranking = Object.values(productosContados)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, parseInt(limit));
    
    return successResponse(res, ranking);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.stockBajo = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      where: {
        estado: true,
        [Op.or]: [
          { stock: { [Op.lte]: sequelize.col('stockMinimo') } },
          { stock: { [Op.lt]: 5 } }
        ]
      },
      attributes: ['id', 'nombre', 'stock', 'stockMinimo']
    });
    
    return successResponse(res, productos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.pedidosPendientes = async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      where: {
        estadoPedido: { [Op.in]: ['Pendiente', 'aprobado', 'enviado'] }
      },
      include: [{ model: Usuario, attributes: ['documento', 'nombre', 'email', 'telefono'] }],
      order: [['createdAt', 'ASC']]
    });
    
    return successResponse(res, pedidos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.ventasPorCliente = async (req, res) => {
  try {
    const rolUsuario = await Rol.findOne({ where: { nombre: 'USUARIO' } });
    if (!rolUsuario) {
      return successResponse(res, []);
    }
    
    const usuarios = await Usuario.findAll({ where: { rolId: rolUsuario.id } });
    
    const ventasPorUsuario = await Promise.all(
      usuarios.map(async (usuario) => {
        const pedidos = await Pedido.findAll({
          where: { 
            usuarioId: usuario.documento,
            estadoPedido: { [Op.notIn]: ['cancelado'] }
          }
        });
        
        const totalGastado = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
        const cantidadPedidos = pedidos.length;
        
        return {
          usuario: {
            documento: usuario.documento,
            nombre: usuario.nombre,
            email: usuario.email
          },
          totalGastado,
          cantidadPedidos
        };
      })
    );
    
    const ranking = ventasPorUsuario
      .filter(c => c.cantidadPedidos > 0)
      .sort((a, b) => b.totalGastado - a.totalGastado);
    
    return successResponse(res, ranking);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.domiciliosEficiencia = async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(dias));
    
    const domicilioQuery = await Domicilio.findAll({
      where: {
        createdAt: { [Op.gte]: fechaInicio }
      }
    });
    
    const totalDomicilios = domicilioQuery.length;
    const entregados = domicilioQuery.filter(d => d.estado === 'entregado').length;
    const enCamino = domicilioQuery.filter(d => d.estado === 'en_camino').length;
    const asignados = domicilioQuery.filter(d => d.estado === 'asignado').length;
    
    return successResponse(res, {
      totalDomicilios,
      entregados,
      enCamino,
      asignados,
      tasaEntrega: totalDomicilios > 0 ? (entregados / totalDomicilios) * 100 : 0
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

exports.index = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const finDia = new Date(hoy);
    finDia.setDate(finDia.getDate() + 1);
    
    const pedidosHoy = await Pedido.findAll({
      where: {
        createdAt: { [Op.between]: [hoy, finDia] },
        estadoPedido: { [Op.notIn]: ['cancelado', 'anulado'] }
      }
    });
    
    const ventasHoy = pedidosHoy.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    
    const haceUnaSemana = new Date(hoy);
    haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
    
    const pedidosSemana = await Pedido.findAll({
      where: {
        createdAt: { [Op.between]: [haceUnaSemana, finDia] },
        estadoPedido: { [Op.notIn]: ['cancelado', 'anulado'] }
      }
    });
    
    const ventasSemana = pedidosSemana.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    
    const haceUnMes = new Date(hoy);
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    
    const pedidosMes = await Pedido.findAll({
      where: {
        createdAt: { [Op.between]: [haceUnMes, finDia] },
        estadoPedido: { [Op.notIn]: ['cancelado', 'anulado'] }
      }
    });
    
    const ventasMes = pedidosMes.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    
    const productosActivos = await Producto.count({ where: { estado: true } });
    const productosStockBajo = await Producto.count({
      where: {
        estado: true,
        [Op.or]: [
          { stock: { [Op.lte]: sequelize.col('stockMinimo') } },
          { stock: { [Op.lt]: 5 } }
        ]
      }
    });
    
    const pedidosPendientes = await Pedido.count({
      where: {
        estadoPedido: { [Op.in]: ['Pendiente', 'aprobado', 'enviado'] }
      }
    });
    
    const usuariosActivos = await Usuario.count({ where: { estado: true } });
    
    return successResponse(res, {
      ventasHoy,
      pedidosHoy: pedidosHoy.length,
      ventasSemana,
      pedidosSemana: pedidosSemana.length,
      ventasMes,
      pedidosMes: pedidosMes.length,
      productosActivos,
      productosStockBajo,
      pedidosPendientes,
      usuariosActivos
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};