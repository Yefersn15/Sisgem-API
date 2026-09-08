const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Categoria, Producto } = require('../../src/models');

describe('Pagos API', () => {
  let adminToken;
  let clienteToken;
  let trabajador1Token;
  let trabajador2Token;
  let pedidoAbonoId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({ nombre: 'ADMIN', permisos: [], estado: true });
    const rolCliente = await Rol.create({ nombre: 'CLIENTE', permisos: [], estado: true });
    const rolTrabajador = await Rol.create({ nombre: 'TRABAJADOR', permisos: ['pagos.read', 'pagos.write', 'pagos.delete'], estado: true });

    await Usuario.create({ documento: '600000001', nombre: 'Admin', email: 'admin.pagos@example.com', password: 'Admin123!', rolId: rolAdmin.id });
    await Usuario.create({ documento: '600000002', nombre: 'Cliente', email: 'cliente.pagos@example.com', password: 'Cliente123!', rolId: rolCliente.id });
    await Usuario.create({ documento: '600000003', nombre: 'Trabajador1', email: 'trabajador1.pagos@example.com', password: 'Trabajador123!', rolId: rolTrabajador.id });
    await Usuario.create({ documento: '600000004', nombre: 'Trabajador2', email: 'trabajador2.pagos@example.com', password: 'Trabajador123!', rolId: rolTrabajador.id });

    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin.pagos@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;
    const loginCliente = await request(app).post('/api/auth/login').send({ email: 'cliente.pagos@example.com', password: 'Cliente123!' });
    clienteToken = loginCliente.body.data.token;
    const loginT1 = await request(app).post('/api/auth/login').send({ email: 'trabajador1.pagos@example.com', password: 'Trabajador123!' });
    trabajador1Token = loginT1.body.data.token;
    const loginT2 = await request(app).post('/api/auth/login').send({ email: 'trabajador2.pagos@example.com', password: 'Trabajador123!' });
    trabajador2Token = loginT2.body.data.token;

    const categoria = await Categoria.create({ nombre: 'GENERAL' });
    const producto = await Producto.create({ nombre: 'Producto Abono', precio: 10000, stock: 20, categoriaId: categoria.id, estado: true });

    const pedido = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        tipo_venta: 'mostrador',
        metodo_pago: 'Abono',
        productos: [{ producto: producto.id, cantidad: 1, precio_unitario: 10000 }],
      });
    pedidoAbonoId = pedido.body.data.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('registrar un pago requiere rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ pedidoId: pedidoAbonoId, monto: 5000, metodo: 'Efectivo' });
    expect(res.status).toBe(403);
  });

  test('registrar un pago parcial actualiza el total pagado del pedido sin marcarlo como venta todavía', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pedidoId: pedidoAbonoId, monto: 4000, metodo: 'Efectivo', estado: 'aplicado' });

    expect(res.status).toBe(201);

    const detalle = await request(app).get(`/api/pedidos/${pedidoAbonoId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(parseFloat(detalle.body.data.totalPagado)).toBe(4000);
    expect(detalle.body.data.esVenta).toBe(false);
  });

  test('un pago no puede registrarse para un pedido que no es por Abono', async () => {
    const categoria = await Categoria.findOne();
    const producto = await Producto.create({ nombre: 'Producto Contado', precio: 5000, stock: 5, categoriaId: categoria.id, estado: true });
    const pedidoContado = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ tipo_venta: 'mostrador', metodo_pago: 'Efectivo', productos: [{ producto: producto.id, cantidad: 1, precio_unitario: 5000 }] });

    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pedidoId: pedidoContado.body.data.id, monto: 1000, metodo: 'Efectivo' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/abono/i);
  });

  test('mis-pagos devuelve los pagos asociados a los pedidos del usuario autenticado', async () => {
    const res = await request(app).get('/api/pagos/mis-pagos').set('Authorization', `Bearer ${clienteToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('rechaza un monto inválido (0 o negativo)', async () => {
    const res = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pedidoId: pedidoAbonoId, monto: 0, metodo: 'Efectivo' });
    expect(res.status).toBe(400);
  });

  describe('Autoría: solo quien registra un pago (o un ADMIN) puede editarlo/eliminarlo', () => {
    let pagoDeTrabajador1;

    test('el pago creado por un trabajador queda marcado con registradoPorDocumento', async () => {
      const res = await request(app)
        .post('/api/pagos')
        .set('Authorization', `Bearer ${trabajador1Token}`)
        .send({ pedidoId: pedidoAbonoId, monto: 500, metodo: 'Efectivo' });

      expect(res.status).toBe(201);
      expect(res.body.data.registradoPorDocumento).toBe('600000003');
      pagoDeTrabajador1 = res.body.data.id;
    });

    test('otro trabajador (no ADMIN, no quien lo registró) no puede editar ese pago', async () => {
      const res = await request(app)
        .put(`/api/pagos/${pagoDeTrabajador1}`)
        .set('Authorization', `Bearer ${trabajador2Token}`)
        .send({ monto: 600 });
      expect(res.status).toBe(403);
    });

    test('otro trabajador no puede eliminar ese pago', async () => {
      const res = await request(app)
        .delete(`/api/pagos/${pagoDeTrabajador1}`)
        .set('Authorization', `Bearer ${trabajador2Token}`);
      expect(res.status).toBe(403);
    });

    test('quien registró el pago SÍ puede editarlo', async () => {
      const res = await request(app)
        .put(`/api/pagos/${pagoDeTrabajador1}`)
        .set('Authorization', `Bearer ${trabajador1Token}`)
        .send({ monto: 700 });
      expect(res.status).toBe(200);
      expect(parseFloat(res.body.data.monto)).toBe(700);
    });

    test('un ADMIN puede editar/eliminar el pago de cualquier trabajador', async () => {
      const editar = await request(app)
        .put(`/api/pagos/${pagoDeTrabajador1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monto: 800 });
      expect(editar.status).toBe(200);

      const eliminar = await request(app)
        .delete(`/api/pagos/${pagoDeTrabajador1}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(eliminar.status).toBe(200);
    });
  });
});
