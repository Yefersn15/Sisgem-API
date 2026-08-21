const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Categoria, Producto } = require('../../src/models');

describe('Pedidos API', () => {
  let clienteToken;
  let clienteDocumento;
  let adminToken;
  let producto;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({ nombre: 'ADMIN', permisos: [], estado: true });
    const rolCliente = await Rol.create({ nombre: 'CLIENTE', permisos: [], estado: true });

    await Usuario.create({ documento: '700000001', nombre: 'Admin', email: 'admin.pedidos@example.com', password: 'Admin123!', rolId: rolAdmin.id });
    await Usuario.create({ documento: '700000002', nombre: 'Cliente', email: 'cliente.pedidos@example.com', password: 'Cliente123!', rolId: rolCliente.id });
    clienteDocumento = '700000002';

    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin.pedidos@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;
    const loginCliente = await request(app).post('/api/auth/login').send({ email: 'cliente.pedidos@example.com', password: 'Cliente123!' });
    clienteToken = loginCliente.body.data.token;

    const categoria = await Categoria.create({ nombre: 'GENERAL' });
    producto = await Producto.create({ nombre: 'Gaseosa', precio: 3000, stock: 10, categoriaId: categoria.id, estado: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('crear un pedido mostrador de contado se aprueba y se convierte en venta de inmediato, descontando stock', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        tipo_venta: 'mostrador',
        metodo_pago: 'Efectivo',
        productos: [{ producto: producto.id, cantidad: 2, precio_unitario: 3000 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.esVenta).toBe(true);
    expect(res.body.data.estadoPedido).toBe('aprobado');

    const productoActualizado = await Producto.findByPk(producto.id);
    expect(productoActualizado.stock).toBe(8); // 10 - 2
  });

  test('crear un pedido rechaza stock insuficiente y no descuenta nada', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        tipo_venta: 'mostrador',
        metodo_pago: 'Efectivo',
        productos: [{ producto: producto.id, cantidad: 999, precio_unitario: 3000 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stock insuficiente/i);

    const productoSinCambios = await Producto.findByPk(producto.id);
    expect(productoSinCambios.stock).toBe(8); // no cambió respecto al test anterior
  });

  test('crear un pedido por Abono queda Pendiente y no se convierte en venta ni descuenta stock', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        tipo_venta: 'mostrador',
        metodo_pago: 'Abono',
        productos: [{ producto: producto.id, cantidad: 1, precio_unitario: 3000 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.esVenta).toBe(false);
    expect(res.body.data.estadoPedido).toBe('Pendiente');

    const productoSinCambios = await Producto.findByPk(producto.id);
    expect(productoSinCambios.stock).toBe(8); // sin descontar todavía
  });

  test('crear un pedido sin productos es rechazado', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ tipo_venta: 'mostrador', metodo_pago: 'Efectivo', productos: [] });
    expect(res.status).toBe(400);
  });

  test('listar pedidos requiere rol ADMIN', async () => {
    const res = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${clienteToken}`);
    expect(res.status).toBe(403);
  });

  test('mis-pedidos devuelve solo los pedidos del usuario autenticado', async () => {
    const res = await request(app).get('/api/pedidos/mis-pedidos').set('Authorization', `Bearer ${clienteToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => p.usuarioId === clienteDocumento)).toBe(true);
  });

  test('un cliente no puede ver el detalle del pedido de otro usuario', async () => {
    const otroLogin = await Usuario.create({ documento: '700000003', nombre: 'Otro', email: 'otro.pedidos@example.com', password: 'Otro123!' });
    const login = await request(app).post('/api/auth/login').send({ email: 'otro.pedidos@example.com', password: 'Otro123!' });
    const otroToken = login.body.data.token;

    const pedidos = await request(app).get('/api/pedidos/mis-pedidos').set('Authorization', `Bearer ${clienteToken}`);
    const pedidoId = pedidos.body.data[0].id;

    const res = await request(app).get(`/api/pedidos/${pedidoId}`).set('Authorization', `Bearer ${otroToken}`);
    expect(res.status).toBe(403);
  });

  test('cambiar estado respeta la máquina de transiciones (no se puede saltar de Pendiente a entregado)', async () => {
    const pedidos = await request(app).get('/api/pedidos/mis-pedidos').set('Authorization', `Bearer ${clienteToken}`);
    const pedidoPendiente = pedidos.body.data.find((p) => p.estadoPedido === 'Pendiente');

    const res = await request(app)
      .patch(`/api/pedidos/${pedidoPendiente.id}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado_pedido: 'entregado' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no se puede pasar de/i);
  });

  test('cancelar un pedido lo marca como cancelado', async () => {
    const create = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ tipo_venta: 'mostrador', metodo_pago: 'Abono', productos: [{ producto: producto.id, cantidad: 1, precio_unitario: 3000 }] });

    const res = await request(app)
      .delete(`/api/pedidos/${create.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const detalle = await request(app).get(`/api/pedidos/${create.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detalle.body.data.estadoPedido).toBe('cancelado');
  });
});
