const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario } = require('../../src/models');

describe('Usuarios API', () => {
  let adminToken;
  let clienteToken;
  let clienteDocumento;
  let admin2Token;
  let admin2Documento;
  let principalToken;
  let rolClienteId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolAdmin = await Rol.create({ nombre: 'ADMIN', permisos: [], estado: true });
    const rolCliente = await Rol.create({ nombre: 'CLIENTE', permisos: [], estado: true });
    rolClienteId = rolCliente.id;

    await Usuario.create({ documento: '400000001', nombre: 'Admin', email: 'admin.usuarios@example.com', password: 'Admin123!', rolId: rolAdmin.id });
    await Usuario.create({ documento: '400000002', nombre: 'Cliente', email: 'cliente.usuarios@example.com', password: 'Cliente123!', rolId: rolCliente.id });
    await Usuario.create({ documento: '400000003', nombre: 'Admin2', email: 'admin2.usuarios@example.com', password: 'Admin123!', rolId: rolAdmin.id });
    await Usuario.create({ documento: '400000004', nombre: 'Principal', email: 'principal.usuarios@example.com', password: 'Admin123!', rolId: rolAdmin.id, esAdminPrincipal: true });
    clienteDocumento = '400000002';
    admin2Documento = '400000003';

    const loginAdmin = await request(app).post('/api/auth/login').send({ email: 'admin.usuarios@example.com', password: 'Admin123!' });
    adminToken = loginAdmin.body.data.token;
    const loginCliente = await request(app).post('/api/auth/login').send({ email: 'cliente.usuarios@example.com', password: 'Cliente123!' });
    clienteToken = loginCliente.body.data.token;
    const loginAdmin2 = await request(app).post('/api/auth/login').send({ email: 'admin2.usuarios@example.com', password: 'Admin123!' });
    admin2Token = loginAdmin2.body.data.token;
    const loginPrincipal = await request(app).post('/api/auth/login').send({ email: 'principal.usuarios@example.com', password: 'Admin123!' });
    principalToken = loginPrincipal.body.data.token;
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

  describe('Protecciones entre administradores', () => {
    test('un admin no puede cambiar su propio rol', async () => {
      const res = await request(app)
        .put('/api/usuarios/400000001')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rolId: rolClienteId });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/no puedes cambiar tu propio rol/i);
    });

    test('un admin no puede desactivar su propia cuenta', async () => {
      const res = await request(app)
        .patch('/api/usuarios/400000001/estado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: false });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/no puedes activar o desactivar tu propia cuenta/i);
    });

    test('un admin normal no puede editar a otro admin', async () => {
      const res = await request(app)
        .put(`/api/usuarios/${admin2Documento}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nombre: 'Hackeado' });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/solo el administrador principal/i);
    });

    test('un admin normal no puede desactivar a otro admin', async () => {
      const res = await request(app)
        .patch(`/api/usuarios/${admin2Documento}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: false });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/solo el administrador principal/i);
    });

    test('un admin normal no puede eliminar a otro admin', async () => {
      const res = await request(app)
        .delete(`/api/usuarios/${admin2Documento}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/solo el administrador principal/i);
    });

    test('un admin normal SÍ puede editar a un cliente (la restricción es solo entre admins)', async () => {
      const res = await request(app)
        .put(`/api/usuarios/${clienteDocumento}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ telefono: '3001112233' });
      expect(res.status).toBe(200);
      expect(res.body.data.telefono).toBe('3001112233');
    });

    test('el administrador principal SÍ puede editar y desactivar a otro admin', async () => {
      const editar = await request(app)
        .put(`/api/usuarios/${admin2Documento}`)
        .set('Authorization', `Bearer ${principalToken}`)
        .send({ nombre: 'Admin2Editado' });
      expect(editar.status).toBe(200);
      expect(editar.body.data.nombre).toBe('Admin2Editado');

      const desactivar = await request(app)
        .patch(`/api/usuarios/${admin2Documento}/estado`)
        .set('Authorization', `Bearer ${principalToken}`)
        .send({ estado: false });
      expect(desactivar.status).toBe(200);
      expect(desactivar.body.data.estado).toBe(false);
    });
  });
});
