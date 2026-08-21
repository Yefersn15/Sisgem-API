const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Marca } = require('../../src/models');

describe('Marcas API', () => {
  let adminToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({
      nombre: 'ADMIN',
      descripcion: 'Administrador',
      permisos: ['marcas.read', 'marcas.write'],
      esDefault: false,
      estado: true,
    });

    await Usuario.create({
      documento: '800000003',
      tipoDocumento: 'CC',
      nombre: 'Admin',
      apellido: 'Test',
      email: 'admin.marcas@example.com',
      password: 'Admin123!',
      rolId: rolAdmin.id,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.marcas@example.com', password: 'Admin123!' });
    adminToken = login.body.data.token;

    // 3 marcas activas, 2 inactivas
    await Marca.bulkCreate([
      { nombre: 'ALPINA', descripcion: 'Marca de lácteos', estado: true },
      { nombre: 'COLGATE', descripcion: 'Marca de aseo', estado: true },
      { nombre: 'POSTOBON', descripcion: 'Marca de bebidas', estado: true },
      { nombre: 'DESCONTINUADA UNO', descripcion: 'Ya no se usa', estado: false },
      { nombre: 'DESCONTINUADA DOS', descripcion: 'Ya no se usa', estado: false },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('un visitante anónimo solo ve marcas activas', async () => {
    const res = await request(app).get('/api/marcas');
    expect(res.status).toBe(200);
    expect(res.body.data.every((m) => m.estado === true)).toBe(true);
    expect(res.body.data.some((m) => m.nombre === 'DESCONTINUADA UNO')).toBe(false);
  });

  test('un admin autenticado ve también las marcas inactivas', async () => {
    const res = await request(app)
      .get('/api/marcas')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((m) => m.nombre === 'DESCONTINUADA UNO')).toBe(true);
  });

  test('sin parámetros de paginación no incluye metadata "pagination"', async () => {
    const res = await request(app).get('/api/marcas');
    expect(res.body.pagination).toBeUndefined();
  });

  test('con page/limit, pagina de verdad en el servidor e incluye metadata', async () => {
    const res = await request(app)
      .get('/api/marcas')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  test('crear una marca requiere rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/marcas')
      .send({ nombre: 'Sin token' });
    expect(res.status).toBe(401);
  });

  test('un ADMIN puede crear una marca y el nombre se guarda en mayúsculas', async () => {
    const res = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'nueva marca', descripcion: 'algo' });
    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('NUEVA MARCA');
  });

  test('no se puede crear una marca con nombre duplicado', async () => {
    const res = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'alpina' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ya existe/i);
  });

  test('crear sin nombre es rechazado por el validador', async () => {
    const res = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ descripcion: 'sin nombre' });
    expect(res.status).toBe(400);
  });

  test('ver detalle de una marca inexistente devuelve 404', async () => {
    const res = await request(app)
      .get('/api/marcas/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrada/i);
  });

  test('eliminar una marca existente funciona', async () => {
    const marca = await Marca.create({ nombre: 'TEMPORAL', descripcion: 'para borrar' });
    const res = await request(app)
      .delete(`/api/marcas/${marca.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada exitosamente/i);
  });
});
