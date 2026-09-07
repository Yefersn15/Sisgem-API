// Lógica de negocio y acceso a datos del dashboard. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
const { Op } = require('sequelize');
const { Pedido, Producto, Usuario, Domicilio, Rol, sequelize } = require('../../models');

const resumenVentas = async (desde, hasta) => {
  const pedidos = await Pedido.findAll({
    where: {
      createdAt: { [Op.between]: [desde, hasta] },
      estadoPedido: { [Op.notIn]: ['cancelado', 'anulado'] }
    }
  });

  const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
  const cantidadPedidos = pedidos.length;

  return {
    totalVentas,
    cantidadPedidos,
    promedioVenta: cantidadPedidos > 0 ? totalVentas / cantidadPedidos : 0
  };
};

exports.ventasDia = async () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);

  return resumenVentas(hoy, mañana);
};

exports.ventasSemana = async () => {
  const hoy = new Date();
  const haceUnaSemana = new Date(hoy);
  haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

  return resumenVentas(haceUnaSemana, hoy);
};

exports.ventasMes = async () => {
  const hoy = new Date();
  const haceUnMes = new Date(hoy);
  haceUnMes.setMonth(haceUnMes.getMonth() - 1);

  return resumenVentas(haceUnMes, hoy);
};

exports.productosMasVendidos = async (limit = 10) => {
  const pedidos = await Pedido.findAll({
    where: { estadoPedido: { [Op.notIn]: ['cancelado'] } }
  });

  const productosContados = {};
  pedidos.forEach((pedido) => {
    const productos = pedido.productos || [];
    productos.forEach((item) => {
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

  return Object.values(productosContados)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, parseInt(limit));
};

// Usadas por el banner de contenido "populares por marca/categoría": mismo
// ranking de productosMasVendidos, filtrado a los productos de esa marca o
// categoría. No se recalcula el conteo desde cero para no duplicar la lógica
// de agregación sobre pedidos.
exports.productosMasVendidosPorMarca = async (marcaId, limit = 10) => {
  const productosDeMarca = await Producto.findAll({ where: { marcaId }, attributes: ['id'] });
  const idsPermitidos = new Set(productosDeMarca.map((p) => String(p.id)));
  const ranking = await exports.productosMasVendidos(9999);
  return ranking.filter((p) => idsPermitidos.has(String(p.productoId))).slice(0, parseInt(limit));
};

exports.productosMasVendidosPorCategoria = async (categoriaId, limit = 10) => {
  const productosDeCategoria = await Producto.findAll({ where: { categoriaId }, attributes: ['id'] });
  const idsPermitidos = new Set(productosDeCategoria.map((p) => String(p.id)));
  const ranking = await exports.productosMasVendidos(9999);
  return ranking.filter((p) => idsPermitidos.has(String(p.productoId))).slice(0, parseInt(limit));
};

exports.stockBajo = async () => {
  return Producto.findAll({
    where: {
      estado: true,
      [Op.or]: [
        { stock: { [Op.lte]: sequelize.col('stock_minimo') } },
        { stock: { [Op.lt]: 5 } }
      ]
    },
    attributes: ['id', 'nombre', 'stock', 'stockMinimo']
  });
};

exports.pedidosPendientes = async () => {
  return Pedido.findAll({
    where: {
      estadoPedido: { [Op.in]: ['Pendiente', 'aprobado', 'enviado'] }
    },
    include: [{ model: Usuario, as: 'usuario', attributes: ['documento', 'nombre', 'email', 'telefono'] }],
    order: [['createdAt', 'ASC']]
  });
};

exports.ventasPorCliente = async () => {
  const rolUsuario = await Rol.findOne({ where: { nombre: 'USUARIO' } });
  if (!rolUsuario) return [];

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

  return ventasPorUsuario
    .filter((c) => c.cantidadPedidos > 0)
    .sort((a, b) => b.totalGastado - a.totalGastado);
};

exports.domiciliosEficiencia = async (dias = 30) => {
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - parseInt(dias));

  const domicilioQuery = await Domicilio.findAll({
    where: {
      createdAt: { [Op.gte]: fechaInicio }
    }
  });

  const totalDomicilios = domicilioQuery.length;
  const entregados = domicilioQuery.filter((d) => d.estado === 'entregado').length;
  const enCamino = domicilioQuery.filter((d) => d.estado === 'en_camino').length;
  const asignados = domicilioQuery.filter((d) => d.estado === 'asignado').length;

  return {
    totalDomicilios,
    entregados,
    enCamino,
    asignados,
    tasaEntrega: totalDomicilios > 0 ? (entregados / totalDomicilios) * 100 : 0
  };
};

exports.resumen = async () => {
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
        { stock: { [Op.lte]: sequelize.col('stock_minimo') } },
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

  return {
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
  };
};
