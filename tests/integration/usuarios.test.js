const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario } = require('../../src/models');

describe('Usuarios API', () => {
  let adminToken;
  let clienteToken;
  let clienteDocumento;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({ nombre: 'ADMIN', permisos: [], estado: true });
    const rolCliente = await Rol.create({ nombre: 'CLIENTE', permisos: [], estado: true });

    await Usuario.create({ documento: '400000001', nombre: 'Admin', email: 'admin.usuarios@example.com', password: 'Admin123!', rolId: rolAdmin.id });
    await Usuario.create({ documento: '400000002', nombre: 'Cliente', email: 'cliente.usuarios@example.com', password: 'Cliente123!', rolId: rolCliente.id });
    clienteDocumento = '400000002';

    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin.usuarios@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;
    const loginCliente = await request(app).post('/api/auth/login').send({ email: 'cliente.usuarios@example.com', password: 'Cliente123!' });
    clienteToken = loginCliente.body.data.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('listar usuarios requiere rol ADMIN', async () => {
    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${clienteToken}`);
    expect(res.status).toBe(403);
  });

  test('ADMIN puede listar usuarios y nunca ve el hash de la contraseña', async () => {
    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((u) => u.password === undefined)).toBe(true);
  });

  test('un usuario puede ver su propio perfil pero no el de otro', async () => {
    const propio = await request(app).get(`/api/usuarios/${clienteDocumento}`).set('Authorization', `Bearer ${clienteToken}`);
    expect(propio.status).toBe(200);

    const otro = await request(app).get('/api/usuarios/400000001').set('Authorization', `Bearer ${clienteToken}`);
    expect(otro.status).toBe(403);
  });

  test('ADMIN crear usuario rechaza email duplicado', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Duplicado', email: 'cliente.usuarios@example.com', password: 'Password123!', documento: '400000099' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email ya está registrado/i);
  });

  test('un usuario puede agregar, listar y eliminar sus propias direcciones', async () => {
    const agregar = await request(app)
      .post('/api/usuarios/direcciones')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ direccion: 'Calle 1', barrio: 'Centro', telefono: '3000000000' });
    expect(agregar.status).toBe(201);
    expect(agregar.body.data.length).toBe(1);
    expect(agregar.body.data[0].es_predeterminada).toBe(true);

    const listar = await request(app).get('/api/usuarios/direcciones').set('Authorization', `Bearer ${clienteToken}`);
    expect(listar.body.data.length).toBe(1);

    const eliminar = await request(app)
      .delete(`/api/usuarios/direcciones/${agregar.body.data[0].nombre}`)
      .set('Authorization', `Bearer ${clienteToken}`);
    expect(eliminar.status).toBe(200);
    expect(eliminar.body.data.length).toBe(0);
  });

  test('no se pueden guardar más de 3 direcciones', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/usuarios/direcciones')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ direccion: `Calle ${i}`, barrio: `Barrio ${i}` });
    }

    const res = await request(app)
      .post('/api/usuarios/direcciones')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ direccion: 'Calle 4', barrio: 'Barrio 4' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/máximo 3/i);
  });
});
