const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Banner } = require('../../src/models');

describe('Banners API', () => {
  let adminToken;

  const imagenUnica = [{ slot: 1, url: 'https://example.com/imagen1.jpg' }];
  const imagenesDuo = [
    { slot: 1, url: 'https://example.com/imagen1.jpg' },
    { slot: 2, url: 'https://example.com/imagen2.jpg' },
  ];

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({
      nombre: 'ADMIN',
      descripcion: 'Administrador',
      permisos: ['banners.read', 'banners.write'],
      esDefault: false,
      estado: true,
    });

    await Usuario.create({
      documento: '800000004',
      tipoDocumento: 'CC',
      nombre: 'Admin',
      apellido: 'Test',
      email: 'admin.banners@example.com',
      password: 'Admin123!',
      rolId: rolAdmin.id,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.banners@example.com', password: 'Admin123!' });
    adminToken = login.body.data.token;

    // 3 banners activos, 2 inactivos
    await Banner.bulkCreate([
      { layout: 'single', images: imagenUnica, titulo: 'Banner Uno', displayOrder: 1, estado: true },
      { layout: 'single', images: imagenUnica, titulo: 'Banner Dos', displayOrder: 2, estado: true },
      { layout: 'single', images: imagenUnica, titulo: 'Banner Tres', displayOrder: 3, estado: true },
      { layout: 'single', images: imagenUnica, titulo: 'Banner Inactivo Uno', displayOrder: 4, estado: false },
      { layout: 'single', images: imagenUnica, titulo: 'Banner Inactivo Dos', displayOrder: 5, estado: false },
    ]);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('un visitante anónimo solo ve banners activos', async () => {
    const res = await request(app).get('/api/banners');
    expect(res.status).toBe(200);
    expect(res.body.data.every((b) => b.estado === true)).toBe(true);
  });

  test('un admin autenticado ve también los banners inactivos', async () => {
    const res = await request(app)
      .get('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);
  });

  test('sin parámetros de paginación no incluye metadata "pagination"', async () => {
    const res = await request(app).get('/api/banners');
    expect(res.body.pagination).toBeUndefined();
  });

  test('con page/limit, pagina de verdad en el servidor e incluye metadata', async () => {
    const res = await request(app)
      .get('/api/banners')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  test('crear un banner requiere rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/banners')
      .send({ layout: 'single', images: imagenUnica });
    expect(res.status).toBe(401);
  });

  test('un ADMIN puede crear un banner con la plantilla "single" y una imagen', async () => {
    const res = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ layout: 'single', images: imagenUnica, titulo: 'Nuevo banner' });
    expect(res.status).toBe(201);
    expect(res.body.data.layout).toBe('single');
  });

  test('rechaza una plantilla no reconocida', async () => {
    const res = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ layout: 'plantilla-inexistente', images: imagenUnica });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no reconocida/i);
  });

  test('rechaza cuando la cantidad de imágenes no coincide con la plantilla', async () => {
    const res = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ layout: 'duo', images: imagenUnica });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/requiere 2 imagen/i);
  });

  test('rechaza cuando alguna casilla de imagen no tiene URL', async () => {
    const res = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ layout: 'duo', images: [{ slot: 1, url: 'https://example.com/a.jpg' }, { slot: 2 }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/deben tener una URL/i);
  });

  test('rechaza una posición de texto inválida', async () => {
    const res = await request(app)
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ layout: 'single', images: imagenUnica, textPosition: 'arriba' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/posición de texto inválida/i);
  });

  test('actualizar un banner inexistente devuelve 404', async () => {
    const res = await request(app)
      .put('/api/banners/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ titulo: 'No existe' });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrado/i);
  });

  test('actualizar un banner respeta la validación de plantilla/imágenes', async () => {
    const banner = await Banner.create({ layout: 'single', images: imagenUnica, titulo: 'Editable' });
    const res = await request(app)
      .put(`/api/banners/${banner.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ layout: 'duo', images: imagenesDuo });
    expect(res.status).toBe(200);
    expect(res.body.data.layout).toBe('duo');
  });

  test('eliminar un banner existente funciona', async () => {
    const banner = await Banner.create({ layout: 'single', images: imagenUnica, titulo: 'Para borrar' });
    const res = await request(app)
      .delete(`/api/banners/${banner.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado exitosamente/i);
  });
});
