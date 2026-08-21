const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Producto, Pedido, Domicilio } = require('../../src/models');

describe('Dashboard API', () => {
  let adminToken;
  let usuarioToken;
  let pedidoPendiente;
  let pedidoAprobado;
  let pedidoEntregado;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({
      nombre: 'ADMIN',
      descripcion: 'Administrador',
      permisos: [],
      esDefault: false,
      estado: true,
    });
    const rolUsuario = await Rol.create({
      nombre: 'USUARIO',
      descripcion: 'Cliente',
      permisos: [],
      esDefault: true,
      estado: true,
    });

    await Usuario.create({
      documento: '900000101',
      tipoDocumento: 'CC',
      nombre: 'Admin',
      apellido: 'Dashboard',
      email: 'admin.dashboard@example.com',
      password: 'Admin123!',
      rolId: rolAdmin.id,
    });
    const cliente = await Usuario.create({
      documento: '900000102',
      tipoDocumento: 'CC',
      nombre: 'Cliente',
      apellido: 'Dashboard',
      email: 'cliente.dashboard@example.com',
      password: 'Cliente123!',
      rolId: rolUsuario.id,
    });

    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.dashboard@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;

    const loginUsuario = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente.dashboard@example.com', password: 'Cliente123!' });
    usuarioToken = loginUsuario.body.data.token;

    // Productos: uno con stock bajo, otro con stock normal.
    await Producto.create({ nombre: 'Stock bajo', precio: 1000, stock: 2, stockMinimo: 10, estado: true });
    await Producto.create({ nombre: 'Stock normal', precio: 1000, stock: 50, stockMinimo: 5, estado: true });

    // Pedidos de hoy, con distintos estados, todos del mismo cliente.
    pedidoPendiente = await Pedido.create({ usuarioId: cliente.documento, total: 1000, estadoPedido: 'Pendiente' });
    await Pedido.create({ usuarioId: cliente.documento, total: 5000, estadoPedido: 'cancelado' });
    pedidoAprobado = await Pedido.create({ usuarioId: cliente.documento, total: 2000, estadoPedido: 'aprobado' });
    pedidoEntregado = await Pedido.create({ usuarioId: cliente.documento, total: 3000, estadoPedido: 'entregado' });

    // Domicilios: uno entregado, uno asignado.
    await Domicilio.create({ pedidoId: pedidoPendiente.id, estado: 'entregado' });
    await Domicilio.create({ pedidoId: pedidoAprobado.id, estado: 'asignado' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('GET /api/dashboard requiere autenticación', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  test('GET /api/dashboard requiere rol ADMIN', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${usuarioToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/dashboard resume las ventas del día excluyendo pedidos cancelados', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // 1000 (pendiente) + 2000 (aprobado) + 3000 (entregado) = 6000; el cancelado de 5000 no cuenta.
    expect(res.body.data.ventasHoy).toBe(6000);
    expect(res.body.data.pedidosHoy).toBe(3);
    expect(res.body.data.pedidosPendientes).toBe(2); // Pendiente + aprobado (no el entregado)
    expect(res.body.data.productosStockBajo).toBe(1);
  });

  test('GET /api/dashboard/ventas/dia calcula total y promedio correctamente', async () => {
    const res = await request(app)
      .get('/api/dashboard/ventas/dia')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalVentas).toBe(6000);
    expect(res.body.data.cantidadPedidos).toBe(3);
    expect(res.body.data.promedioVenta).toBe(2000);
  });

  test('GET /api/dashboard/stock-bajo solo devuelve productos con poco stock', async () => {
    const res = await request(app)
      .get('/api/dashboard/stock-bajo')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].nombre).toBe('Stock bajo');
  });

  test('GET /api/dashboard/pedidos/pendientes solo incluye Pendiente/aprobado/enviado', async () => {
    const res = await request(app)
      .get('/api/dashboard/pedidos/pendientes')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    const estados = res.body.data.map((p) => p.estadoPedido);
    expect(estados.sort()).toEqual(['Pendiente', 'aprobado']);
  });

  test('GET /api/dashboard/ventas/por-cliente agrupa el gasto por cliente', async () => {
    const res = await request(app)
      .get('/api/dashboard/ventas/por-cliente')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].usuario.email).toBe('cliente.dashboard@example.com');
    // No incluye el pedido cancelado.
    expect(res.body.data[0].totalGastado).toBe(6000);
    expect(res.body.data[0].cantidadPedidos).toBe(3);
  });

  test('GET /api/dashboard/domicilios/eficiencia calcula la tasa de entrega', async () => {
    const res = await request(app)
      .get('/api/dashboard/domicilios/eficiencia')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalDomicilios).toBe(2);
    expect(res.body.data.entregados).toBe(1);
    expect(res.body.data.asignados).toBe(1);
    expect(res.body.data.tasaEntrega).toBe(50);
  });
});
