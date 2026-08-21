const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/models');

describe('Auth API', () => {
  const nuevoUsuario = {
    documento: '900111222',
    tipoDocumento: 'CC',
    nombre: 'Test',
    apellido: 'User',
    email: 'test.auth@example.com',
    password: 'Password123!',
    telefono: '3001234567',
    genero: 'Otro',
    direccion: 'Calle 1',
    barrio: 'Centro',
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('POST /api/auth/register crea el usuario (no devuelve token, hay que iniciar sesión después)', async () => {
    const res = await request(app).post('/api/auth/register').send(nuevoUsuario);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/auth/register rechaza un email ya registrado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...nuevoUsuario, documento: '900111223' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/email ya está registrado/i);
  });

  test('POST /api/auth/register rechaza un documento ya registrado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...nuevoUsuario, email: 'otro@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/documento ya está registrado/i);
  });

  test('POST /api/auth/login con credenciales correctas devuelve un token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: nuevoUsuario.email, password: nuevoUsuario.password });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.usuario.email).toBe(nuevoUsuario.email);
    expect(res.body.data.usuario.password).toBeUndefined();
  });

  test('POST /api/auth/login con contraseña incorrecta devuelve 400 sin filtrar cuál campo falló', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: nuevoUsuario.email, password: 'incorrecta' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/credenciales inválidas/i);
  });

  test('GET /api/auth/me sin token devuelve 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me con token válido devuelve los datos del usuario', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: nuevoUsuario.email, password: nuevoUsuario.password });
    const token = login.body.data.token;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(nuevoUsuario.email);
  });

  describe('POST /api/auth/change-password', () => {
    let token;

    beforeAll(async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: nuevoUsuario.email, password: nuevoUsuario.password });
      token = login.body.data.token;
    });

    test('rechaza el cambio si no se envía la contraseña actual', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'NuevaPassword123!' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/contraseña actual/i);
    });

    test('rechaza el cambio si la contraseña actual es incorrecta', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'incorrecta', password: 'NuevaPassword123!' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/incorrecta/i);
    });

    test('con la contraseña actual correcta, cambia la contraseña y la nueva sirve para iniciar sesión', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: nuevoUsuario.password, password: 'NuevaPassword123!' });
      expect(res.status).toBe(200);

      const loginViejo = await request(app)
        .post('/api/auth/login')
        .send({ email: nuevoUsuario.email, password: nuevoUsuario.password });
      expect(loginViejo.status).toBe(400);

      const loginNuevo = await request(app)
        .post('/api/auth/login')
        .send({ email: nuevoUsuario.email, password: 'NuevaPassword123!' });
      expect(loginNuevo.status).toBe(200);
    });
  });
});

// El límite de intentos de auth se prueba en tests/integration/rateLimiting.test.js,
// en su propio archivo con un tope bajo aparte, para no interferir con el
// flujo normal de este archivo (que ya suma varias solicitudes de auth).
