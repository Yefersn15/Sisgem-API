const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario } = require('../../src/models');

describe('Roles API', () => {
  let rolAdmin;
  let rolUsuario;
  let rolVacio; // sin usuarios asociados, para probar eliminación exitosa
  let adminToken;
  let usuarioToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    rolAdmin = await Rol.create({
      nombre: 'ADMIN',
      descripcion: 'Administrador del sistema',
      permisos: ['roles.read', 'roles.write'],
      esDefault: false,
      estado: true,
    });

    rolUsuario = await Rol.create({
      nombre: 'USUARIO',
      descripcion: 'Cliente',
      permisos: ['perfil.read'],
      esDefault: true,
      estado: true,
    });

    rolVacio = await Rol.create({
      nombre: 'TEMPORAL',
      descripcion: 'Rol sin usuarios asociados',
      permisos: [],
      esDefault: false,
      estado: true,
    });

    await Usuario.create({
      documento: '800000010',
      tipoDocumento: 'CC',
      nombre: 'Admin',
      apellido: 'Roles',
      email: 'admin.roles@example.com',
      password: 'Admin123!',
      rolId: rolAdmin.id,
    });

    await Usuario.create({
      documento: '800000011',
      tipoDocumento: 'CC',
      nombre: 'Cliente',
      apellido: 'Roles',
      email: 'cliente.roles@example.com',
      password: 'Cliente123!',
      rolId: rolUsuario.id,
    });

    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.roles@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;

    const loginUsuario = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente.roles@example.com', password: 'Cliente123!' });
    usuarioToken = loginUsuario.body.data.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('GET /api/roles/permisos es público y devuelve la lista de permisos disponibles', async () => {
    const res = await request(app).get('/api/roles/permisos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toContain('roles.read');
  });

  test('GET /api/roles/nombre/:nombre es público', async () => {
    const res = await request(app).get('/api/roles/nombre/ADMIN');
    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe('ADMIN');
  });

  test('GET /api/roles/nombre/:nombre con un nombre inexistente devuelve 404', async () => {
    const res = await request(app).get('/api/roles/nombre/NO_EXISTE');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrado/i);
  });

  test('POST /api/roles/seed no crea nada si ya hay roles', async () => {
    const res = await request(app).post('/api/roles/seed');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/ya existen/i);
  });

  test('GET /api/roles requiere token', async () => {
    const res = await request(app).get('/api/roles');
    expect(res.status).toBe(401);
  });

  test('GET /api/roles requiere rol ADMIN (un usuario normal no puede listar)', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${usuarioToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/roles con token ADMIN lista los roles', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
  });

  test('GET /api/roles/:id funciona para cualquier usuario autenticado', async () => {
    const res = await request(app)
      .get(`/api/roles/${rolAdmin.id}`)
      .set('Authorization', `Bearer ${usuarioToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toBe('ADMIN');
  });

  test('POST /api/roles requiere rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${usuarioToken}`)
      .send({ nombre: 'NUEVO_ROL' });
    expect(res.status).toBe(403);
  });

  test('POST /api/roles con ADMIN crea un rol nuevo', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'REPARTIDOR', descripcion: 'Encargado de domicilios', permisos: ['domicilios.read'] });
    expect(res.status).toBe(201);
    expect(res.body.data.nombre).toBe('REPARTIDOR');
  });

  test('POST /api/roles rechaza un nombre de rol duplicado', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/el rol ya existe/i);
  });

  test('POST /api/roles rechaza un cuerpo sin nombre', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ descripcion: 'Sin nombre' });
    expect(res.status).toBe(400);
  });

  test('PUT /api/roles/:id actualiza el rol', async () => {
    const res = await request(app)
      .put(`/api/roles/${rolVacio.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ descripcion: 'Descripción actualizada' });
    expect(res.status).toBe(200);
    expect(res.body.data.descripcion).toBe('Descripción actualizada');
  });

  test('PUT /api/roles/:id rechaza renombrar a un nombre ya usado por otro rol', async () => {
    const res = await request(app)
      .put(`/api/roles/${rolVacio.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'USUARIO' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/el nombre del rol ya existe/i);
  });

  test('DELETE /api/roles/:id no permite eliminar el rol ADMIN', async () => {
    const res = await request(app)
      .delete(`/api/roles/${rolAdmin.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no se puede eliminar el rol admin/i);
  });

  test('DELETE /api/roles/:id no permite eliminar un rol con usuarios asociados', async () => {
    const res = await request(app)
      .delete(`/api/roles/${rolUsuario.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no se puede eliminar el rol porque hay usuarios asociados/i);
  });

  test('DELETE /api/roles/:id elimina un rol sin usuarios asociados', async () => {
    const res = await request(app)
      .delete(`/api/roles/${rolVacio.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const buscado = await Rol.findByPk(rolVacio.id);
    expect(buscado).toBeNull();
  });

  test('PATCH /api/roles/:id/estado no permite desactivar el rol ADMIN', async () => {
    const res = await request(app)
      .patch(`/api/roles/${rolAdmin.id}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: false });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no se puede desactivar el rol admin/i);
  });

  test('PATCH /api/roles/:id/estado desactiva un rol distinto de ADMIN', async () => {
    const res = await request(app)
      .patch(`/api/roles/${rolUsuario.id}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: false });
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe(false);
  });
});
