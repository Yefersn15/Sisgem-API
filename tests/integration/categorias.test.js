const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Categoria, Producto } = require('../../src/models');

describe('Categorías API', () => {
  let adminToken;
  let categoriaConProductos;
  let categoriaSinProductos;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({
      nombre: 'ADMIN',
      descripcion: 'Administrador',
      permisos: ['categorias.read', 'categorias.write'],
      esDefault: false,
      estado: true,
    });

    await Usuario.create({
      documento: '800000002',
      tipoDocumento: 'CC',
      nombre: 'Admin',
      apellido: 'Test',
      email: 'admin.categorias@example.com',
      password: 'Admin123!',
      rolId: rolAdmin.id,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.categorias@example.com', password: 'Admin123!' });
    adminToken = login.body.data.token;

    // 3 categorías activas, 2 inactivas
    await Categoria.bulkCreate([
      { nombre: 'BEBIDAS', descripcion: 'Bebidas en general', estado: true },
      { nombre: 'LACTEOS', descripcion: 'Productos lácteos', estado: true },
      { nombre: 'ASEO', descripcion: 'Productos de aseo', estado: true },
      { nombre: 'DESCONTINUADA UNO', descripcion: 'Ya no se usa', estado: false },
      { nombre: 'DESCONTINUADA DOS', descripcion: 'Ya no se usa', estado: false },
    ]);

    categoriaConProductos = await Categoria.create({ nombre: 'CON PRODUCTOS', descripcion: 'Tiene productos' });
    categoriaSinProductos = await Categoria.create({ nombre: 'SIN PRODUCTOS', descripcion: 'No tiene productos' });

    await Producto.create({
      nombre: 'Producto asociado',
      precio: 1000,
      stock: 5,
      categoriaId: categoriaConProductos.id,
      estado: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('un visitante anónimo solo ve categorías activas', async () => {
    const res = await request(app).get('/api/categorias');
    expect(res.status).toBe(200);
    expect(res.body.data.every((c) => c.estado === true)).toBe(true);
    expect(res.body.data.some((c) => c.nombre === 'DESCONTINUADA UNO')).toBe(false);
  });

  test('un admin autenticado ve también las categorías inactivas', async () => {
    const res = await request(app)
      .get('/api/categorias')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((c) => c.nombre === 'DESCONTINUADA UNO')).toBe(true);
  });

  test('sin parámetros de paginación no incluye metadata "pagination"', async () => {
    const res = await request(app).get('/api/categorias');
    expect(res.body.pagination).toBeUndefined();
  });

  test('con page/limit, pagina de verdad en el servidor e incluye metadata', async () => {
    const res = await request(app)
      .get('/api/categorias')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  test('crear una categoría requiere rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/categorias')
      .send({ nombre: 'Sin token' });
    expect(res.status).toBe(401);
  });

  test('un ADMIN puede crear una categoría y el nombre se guarda en mayúsculas', async () => {
    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'nueva categoria', descripcion: 'algo' });
    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('NUEVA CATEGORIA');
  });

  test('no se puede crear una categoría con nombre duplicado', async () => {
    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'bebidas' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ya existe/i);
  });

  test('crear sin nombre es rechazado por el validador', async () => {
    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ descripcion: 'sin nombre' });
    expect(res.status).toBe(400);
  });

  test('no se puede eliminar una categoría que tiene productos asociados', async () => {
    const res = await request(app)
      .delete(`/api/categorias/${categoriaConProductos.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/productos asociados/i);
  });

  test('se puede eliminar una categoría sin productos asociados', async () => {
    const res = await request(app)
      .delete(`/api/categorias/${categoriaSinProductos.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('ver detalle de una categoría inexistente devuelve 404', async () => {
    const res = await request(app)
      .get('/api/categorias/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrada/i);
  });
});
