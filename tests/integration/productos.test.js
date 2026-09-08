const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Categoria, Producto, Marca } = require('../../src/models');

describe('Productos API', () => {
  let categoria;
  let adminToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({
      nombre: 'ADMIN',
      descripcion: 'Administrador',
      permisos: ['productos.read', 'productos.write'],
      esDefault: false,
      estado: true,
    });

    await Usuario.create({
      documento: '800000001',
      tipoDocumento: 'CC',
      nombre: 'Admin',
      apellido: 'Test',
      email: 'admin.productos@example.com',
      password: 'Admin123!',
      rolId: rolAdmin.id,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.productos@example.com', password: 'Admin123!' });
    adminToken = login.body.data.token;

    categoria = await Categoria.create({ nombre: 'BEBIDAS', descripcion: 'Bebidas en general' });

    // 3 productos activos, 2 inactivos (nombres deliberadamente distintos entre
    // sí, sin subcadenas en común, para que las pruebas de búsqueda sean inequívocas)
    await Producto.bulkCreate([
      { nombre: 'Gaseosa Cola', precio: 1000, stock: 10, categoriaId: categoria.id, estado: true },
      { nombre: 'Jugo de Naranja', precio: 2000, stock: 5, categoriaId: categoria.id, estado: true },
      { nombre: 'Agua Mineral', precio: 3000, stock: 8, categoriaId: categoria.id, estado: true },
      { nombre: 'Cerveza Descontinuada', precio: 4000, stock: 0, categoriaId: categoria.id, estado: false },
      { nombre: 'Te Helado Descontinuado', precio: 5000, stock: 0, categoriaId: categoria.id, estado: false },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('un visitante anónimo solo ve productos activos', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data.every((p) => p.estado === true)).toBe(true);
  });

  test('un admin autenticado ve también los productos inactivos', async () => {
    const res = await request(app)
      .get('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
  });

  test('sin parámetros de paginación no incluye metadata "pagination" (compatibilidad hacia atrás)', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.body.pagination).toBeUndefined();
  });

  test('con page/limit, pagina de verdad en el servidor e incluye metadata', async () => {
    const res = await request(app)
      .get('/api/productos')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
  });

  test('la página 2 trae los siguientes elementos, sin repetir los de la página 1', async () => {
    const p1 = await request(app)
      .get('/api/productos')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);
    const p2 = await request(app)
      .get('/api/productos')
      .query({ page: 2, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    const idsP1 = p1.body.data.map((p) => p.id);
    const idsP2 = p2.body.data.map((p) => p.id);
    expect(idsP2.length).toBe(2);
    expect(idsP1.some((id) => idsP2.includes(id))).toBe(false);
  });

  test('el filtro de búsqueda por nombre funciona junto con la paginación', async () => {
    const res = await request(app)
      .get('/api/productos')
      .query({ search: 'naranja', page: 1, limit: 10 })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].nombre).toBe('Jugo de Naranja');
  });

  test('crear un producto requiere rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/productos')
      .send({ nombre: 'Sin token', precio: 100, categoriaId: categoria.id });
    expect(res.status).toBe(401);
  });

  test('un producto creado queda marcado con quién lo creó (solo informativo, no restringe edición)', async () => {
    const marca = await Marca.create({ nombre: `MARCA-AUTORIA-${Date.now()}` });
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Producto Con Autoria', precio: 100, categoriaId: categoria.id, marcaId: marca.id });

    expect(res.status).toBe(201);
    expect(res.body.data.creadoPorDocumento).toBe('800000001');
    expect(res.body.data.creadoPorNombre).toBe('Admin');
  });
});
