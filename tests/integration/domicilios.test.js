const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Categoria, Producto } = require('../../src/models');

describe('Domicilios API', () => {
  let adminToken;
  let clienteToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({ nombre: 'ADMIN', permisos: [], estado: true });
    const rolCliente = await Rol.create({ nombre: 'CLIENTE', permisos: [], estado: true });

    await Usuario.create({ documento: '500000001', nombre: 'Admin', email: 'admin.domicilios@example.com', password: 'Admin123!', rolId: rolAdmin.id });
    await Usuario.create({ documento: '500000002', nombre: 'Cliente', email: 'cliente.domicilios@example.com', password: 'Cliente123!', rolId: rolCliente.id });

    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin.domicilios@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;
    const loginCliente = await request(app).post('/api/auth/login').send({ email: 'cliente.domicilios@example.com', password: 'Cliente123!' });
    clienteToken = loginCliente.body.data.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const crearPedidoDomicilio = async () => {
    const categoria = await Categoria.create({ nombre: `CAT-${Date.now()}-${Math.random()}` });
    const producto = await Producto.create({ nombre: 'Producto Domicilio', precio: 8000, stock: 15, categoriaId: categoria.id, estado: true });
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        tipo_venta: 'domicilio',
        metodo_pago: 'Efectivo',
        direccion: { direccion: 'Calle falsa 123', barrio: 'Centro', telefono: '3000000000' },
        productos: [{ producto: producto.id, cantidad: 1, precio_unitario: 8000 }],
      });
    return res.body.data;
  };

  test('crear domicilio requiere que el pedido esté aprobado (no Pendiente)', async () => {
    const rolCliente = await Rol.findOne({ where: { nombre: 'CLIENTE' } });
    await Usuario.create({ documento: '500000003', nombre: 'Cliente2', email: 'cliente2.domicilios@example.com', password: 'Cliente123!', rolId: rolCliente.id });
    const login = await request(app).post('/api/auth/login').send({ email: 'cliente2.domicilios@example.com', password: 'Cliente123!' });
    const token = login.body.data.token;

    const categoria = await Categoria.create({ nombre: `CAT-ABONO-${Date.now()}` });
    const producto = await Producto.create({ nombre: 'Producto Abono Dom', precio: 5000, stock: 5, categoriaId: categoria.id, estado: true });
    const pedidoAbono = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo_venta: 'domicilio', metodo_pago: 'Abono', direccion: { direccion: 'X', barrio: 'Y' }, productos: [{ producto: producto.id, cantidad: 1, precio_unitario: 5000 }] });

    expect(pedidoAbono.body.data.estadoPedido).toBe('Pendiente');

    const res = await request(app)
      .post('/api/domicilios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pedidoId: pedidoAbono.body.data.id, direccion: 'Calle falsa 123', barrio: 'Centro' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/debe estar aprobado/i);
  });

  test('un pedido domicilio de contado ya viene aprobado y con domicilio creado automáticamente', async () => {
    const pedido = await crearPedidoDomicilio();
    expect(pedido.estadoPedido).toBe('aprobado');

    const domicilios = await request(app).get('/api/domicilios').set('Authorization', `Bearer ${adminToken}`).query({ pedido: pedido.id });
    expect(domicilios.body.data.length).toBe(1);
    expect(domicilios.body.data[0].estado).toBe('Pendiente');
  });

  test('listar domicilios requiere rol ADMIN', async () => {
    const res = await request(app).get('/api/domicilios').set('Authorization', `Bearer ${clienteToken}`);
    expect(res.status).toBe(403);
  });

  test('asignar repartidor mueve el domicilio y el pedido a estado "asignado"', async () => {
    const pedido = await crearPedidoDomicilio();
    const domicilios = await request(app).get('/api/domicilios').set('Authorization', `Bearer ${adminToken}`).query({ pedido: pedido.id });
    const domicilioId = domicilios.body.data[0].id;

    const res = await request(app)
      .patch(`/api/domicilios/${domicilioId}/repartidor`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Juan Repartidor', telefono: '3001112233' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('asignado');
    expect(res.body.data.repartidor.nombre).toBe('Juan Repartidor');

    const pedidoActualizado = await request(app).get(`/api/pedidos/${pedido.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(pedidoActualizado.body.data.estadoPedido).toBe('asignado');
  });

  test('marcar un domicilio como entregado descuenta stock y convierte el pedido en venta', async () => {
    const pedido = await crearPedidoDomicilio();
    const domicilios = await request(app).get('/api/domicilios').set('Authorization', `Bearer ${adminToken}`).query({ pedido: pedido.id });
    const domicilioId = domicilios.body.data[0].id;

    await request(app).patch(`/api/domicilios/${domicilioId}/repartidor`).set('Authorization', `Bearer ${adminToken}`).send({ nombre: 'Repartidor', telefono: '3000000000' });
    await request(app).patch(`/api/domicilios/${domicilioId}/estado`).set('Authorization', `Bearer ${adminToken}`).send({ estado: 'en_camino' });

    const productoId = pedido.productos[0].producto;
    const productoAntes = await Producto.findByPk(productoId);

    const res = await request(app).patch(`/api/domicilios/${domicilioId}/estado`).set('Authorization', `Bearer ${adminToken}`).send({ estado: 'entregado' });
    expect(res.status).toBe(200);

    const productoDespues = await Producto.findByPk(productoId);
    expect(productoDespues.stock).toBe(productoAntes.stock - 1);

    const pedidoFinal = await request(app).get(`/api/pedidos/${pedido.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(pedidoFinal.body.data.esVenta).toBe(true);
  });

  test('actualizar un domicilio (PATCH) no falla por transacción indefinida (bug corregido en la migración)', async () => {
    const pedido = await crearPedidoDomicilio();
    const domicilios = await request(app).get('/api/domicilios').set('Authorization', `Bearer ${adminToken}`).query({ pedido: pedido.id });
    const domicilioId = domicilios.body.data[0].id;

    const res = await request(app)
      .patch(`/api/domicilios/${domicilioId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ observaciones: 'Dejar en portería' });

    expect(res.status).toBe(200);
  });

  test('no se puede saltar transiciones de estado inválidas', async () => {
    const pedido = await crearPedidoDomicilio();
    const domicilios = await request(app).get('/api/domicilios').set('Authorization', `Bearer ${adminToken}`).query({ pedido: pedido.id });
    const domicilioId = domicilios.body.data[0].id;

    const res = await request(app)
      .patch(`/api/domicilios/${domicilioId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'entregado' }); // desde Pendiente, sin pasar por asignado/en_camino

    expect(res.status).toBe(400);
  });
});
