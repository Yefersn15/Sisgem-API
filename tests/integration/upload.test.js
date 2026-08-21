// Pruebas livianas: no ejercitan Cloudinary de verdad (no hay credenciales
// reales en el entorno de test). Solo verifican el guardia de autenticación
// y las validaciones que ocurren ANTES de llamar a Cloudinary.
const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario } = require('../../src/models');

describe('Upload API', () => {
  let adminToken;
  let usuarioToken;

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
      documento: '900000201',
      tipoDocumento: 'CC',
      nombre: 'Admin',
      apellido: 'Upload',
      email: 'admin.upload@example.com',
      password: 'Admin123!',
      rolId: rolAdmin.id,
    });
    await Usuario.create({
      documento: '900000202',
      tipoDocumento: 'CC',
      nombre: 'Cliente',
      apellido: 'Upload',
      email: 'cliente.upload@example.com',
      password: 'Cliente123!',
      rolId: rolUsuario.id,
    });

    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.upload@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;

    const loginUsuario = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente.upload@example.com', password: 'Cliente123!' });
    usuarioToken = loginUsuario.body.data.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('GET /api/upload requiere autenticación', async () => {
    const res = await request(app).get('/api/upload');
    expect(res.status).toBe(401);
  });

  test('GET /api/upload requiere rol ADMIN', async () => {
    const res = await request(app)
      .get('/api/upload')
      .set('Authorization', `Bearer ${usuarioToken}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/upload requiere autenticación', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(401);
  });

  test('POST /api/upload requiere rol ADMIN', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${usuarioToken}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/upload con ADMIN pero sin archivo devuelve 400 (no llega a Cloudinary)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no se proporcionó ninguna imagen/i);
  });

  test('POST /api/upload con un archivo que no es imagen devuelve 400 (no llega a Cloudinary)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('imagen', Buffer.from('contenido de texto plano'), {
        filename: 'documento.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/el archivo debe ser una imagen/i);
  });

  test('DELETE /api/upload requiere autenticación', async () => {
    const res = await request(app).delete('/api/upload');
    expect(res.status).toBe(401);
  });

  test('DELETE /api/upload requiere rol ADMIN', async () => {
    const res = await request(app)
      .delete('/api/upload')
      .set('Authorization', `Bearer ${usuarioToken}`);
    expect(res.status).toBe(403);
  });

  test('DELETE /api/upload con ADMIN pero sin publicId devuelve 400 (no llega a Cloudinary)', async () => {
    const res = await request(app)
      .delete('/api/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/publicid requerido/i);
  });
});
