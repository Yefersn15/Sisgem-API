// Archivo aparte a propósito: fija un tope bajo SOLO para este archivo
// (antes de requerir src/app, que es cuando rateLimit.js lee la env var),
// para no interferir con las demás pruebas que sí necesitan un tope alto.
process.env.AUTH_RATE_LIMIT_MAX = '3';

const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/models');

describe('Rate limiting', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('el limitador de auth deja pasar hasta el máximo configurado y bloquea el resto con 429', async () => {
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nadie@example.com', password: 'x' });
      statuses.push(res.status);
    }

    // Las primeras 3 se procesan normalmente (credenciales inválidas = 400).
    expect(statuses.slice(0, 3)).toEqual([400, 400, 400]);
    // De la 4ª en adelante, el límite ya se agotó.
    expect(statuses.slice(3)).toEqual([429, 429]);
  });
});
