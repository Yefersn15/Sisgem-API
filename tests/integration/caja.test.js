const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Categoria, Producto } = require('../../src/models');

describe('Caja API', () => {
  let adminToken;
  let clienteToken;
  let trabajadorToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({ nombre: 'ADMIN', permisos: [], estado: true });
    const rolCliente = await Rol.create({ nombre: 'CLIENTE', permisos: [], estado: true });
    const rolTrabajador = await Rol.create({ nombre: 'TRABAJADOR', permisos: ['caja.read', 'caja.write'], estado: true });

    await Usuario.create({ documento: '700000001', nombre: 'Admin', email: 'admin.caja@example.com', password: 'Admin123!', rolId: rolAdmin.id });
    await Usuario.create({ documento: '700000002', nombre: 'Cliente', email: 'cliente.caja@example.com', password: 'Cliente123!', rolId: rolCliente.id });
    await Usuario.create({ documento: '700000003', nombre: 'Trabajador', email: 'trabajador.caja@example.com', password: 'Trabajador123!', rolId: rolTrabajador.id });

    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin.caja@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;
    const loginCliente = await request(app).post('/api/auth/login').send({ email: 'cliente.caja@example.com', password: 'Cliente123!' });
    clienteToken = loginCliente.body.data.token;
    const loginTrabajador = await request(app).post('/api/auth/login').send({ email: 'trabajador.caja@example.com', password: 'Trabajador123!' });
    trabajadorToken = loginTrabajador.body.data.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const crearVentaContado = async (metodoPago = 'Efectivo', precio = 10000) => {
    const categoria = await Categoria.create({ nombre: `CAT-CAJA-${Date.now()}-${Math.random()}` });
    const producto = await Producto.create({ nombre: 'Producto Caja', precio, stock: 20, categoriaId: categoria.id, estado: true });
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ tipo_venta: 'mostrador', metodo_pago: metodoPago, productos: [{ producto: producto.id, cantidad: 1, precio_unitario: precio }] });
    return res.body.data;
  };

  test('abrir caja requiere permiso caja.write (un cliente sin ese permiso no puede)', async () => {
    const res = await request(app)
      .post('/api/caja/abrir')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ montoInicial: 50000 });
    expect(res.status).toBe(403);
  });

  test('un trabajador con permiso caja.write puede abrir una caja con monto inicial', async () => {
    const res = await request(app)
      .post('/api/caja/abrir')
      .set('Authorization', `Bearer ${trabajadorToken}`)
      .send({ montoInicial: 50000, notas: 'Apertura de turno mañana' });

    expect(res.status).toBe(201);
    expect(res.body.data.estado).toBe('abierta');
    expect(parseFloat(res.body.data.montoInicial)).toBe(50000);
    expect(res.body.data.abiertoPorDocumento).toBe('700000003');
  });

  test('no se puede abrir una segunda caja mientras haya una abierta', async () => {
    const res = await request(app)
      .post('/api/caja/abrir')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ montoInicial: 10000 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ya hay una caja abierta/i);
  });

  test('GET /api/caja/actual devuelve la sesión abierta y un resumen en vivo del efectivo esperado', async () => {
    await crearVentaContado('Efectivo', 15000);
    await crearVentaContado('Tarjeta', 8000);

    const res = await request(app).get('/api/caja/actual').set('Authorization', `Bearer ${trabajadorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sesion.estado).toBe('abierta');
    expect(res.body.data.resumen.efectivoVentas).toBe(15000);
    expect(res.body.data.resumen.ventas.porMetodo['Tarjeta']).toBe(8000);
    // 50000 iniciales + 15000 en efectivo vendido
    expect(res.body.data.resumen.efectivoEsperado).toBe(65000);
  });

  test('cerrar la caja calcula la diferencia entre lo esperado y lo contado, y deja el resumen congelado', async () => {
    const abierta = await request(app).get('/api/caja/actual').set('Authorization', `Bearer ${trabajadorToken}`);
    const sesionId = abierta.body.data.sesion.id;

    const res = await request(app)
      .patch(`/api/caja/${sesionId}/cerrar`)
      .set('Authorization', `Bearer ${trabajadorToken}`)
      .send({ montoContado: 64000, notas: 'Faltó dinero por revisar' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('cerrada');
    expect(res.body.data.cerradoPorDocumento).toBe('700000003');
    expect(res.body.data.resumenCierre.efectivoEsperado).toBe(65000);
    expect(res.body.data.resumenCierre.diferencia).toBe(-1000);
  });

  test('no se puede cerrar una caja que ya está cerrada', async () => {
    const historial = await request(app).get('/api/caja').set('Authorization', `Bearer ${adminToken}`);
    const sesionCerrada = historial.body.data.find((s) => s.estado === 'cerrada');

    const res = await request(app)
      .patch(`/api/caja/${sesionCerrada.id}/cerrar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ montoContado: 1000 });
    expect(res.status).toBe(400);
  });

  test('después de cerrar, se puede volver a abrir una caja nueva', async () => {
    const res = await request(app)
      .post('/api/caja/abrir')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ montoInicial: 20000 });
    expect(res.status).toBe(201);

    const actual = await request(app).get('/api/caja/actual').set('Authorization', `Bearer ${adminToken}`);
    expect(actual.body.data.sesion.id).toBe(res.body.data.id);
  });

  test('listar historial de caja requiere permiso caja.read', async () => {
    const res = await request(app).get('/api/caja').set('Authorization', `Bearer ${clienteToken}`);
    expect(res.status).toBe(403);
  });
});
