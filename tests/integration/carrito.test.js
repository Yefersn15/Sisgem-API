const request = require('supertest');
const app = require('../../src/app');
const { sequelize, Rol, Usuario, Producto } = require('../../src/models');

describe('Carrito API', () => {
  let userToken;
  let productoConStock;
  let productoSinStock;
  let productoInactivo;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const rolUsuario = await Rol.create({
      nombre: 'USUARIO',
      descripcion: 'Cliente',
      permisos: [],
      esDefault: true,
      estado: true,
    });

    await Usuario.create({
      documento: '900000001',
      tipoDocumento: 'CC',
      nombre: 'Cliente',
      apellido: 'Carrito',
      email: 'cliente.carrito@example.com',
      password: 'Cliente123!',
      rolId: rolUsuario.id,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente.carrito@example.com', password: 'Cliente123!' });
    userToken = login.body.data.token;

    productoConStock = await Producto.create({ nombre: 'Gaseosa', precio: 1500, stock: 10, estado: true });
    productoSinStock = await Producto.create({ nombre: 'Agua', precio: 1000, stock: 1, estado: true });
    productoInactivo = await Producto.create({ nombre: 'Descontinuado', precio: 500, stock: 5, estado: false });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('todas las rutas del carrito requieren autenticación', async () => {
    const res = await request(app).get('/api/carrito');
    expect(res.status).toBe(401);
  });

  test('un carrito nuevo empieza vacío', async () => {
    const res = await request(app)
      .get('/api/carrito')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  test('agregar un item sin productoId es rechazado', async () => {
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cantidad: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id de producto requerido/i);
  });

  test('agregar un producto inexistente devuelve 404', async () => {
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productoId: 999999 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/producto no encontrado/i);
  });

  test('agregar un producto inactivo es rechazado', async () => {
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productoId: productoInactivo.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/producto no disponible/i);
  });

  test('agregar más cantidad que el stock disponible es rechazado', async () => {
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productoId: productoSinStock.id, cantidad: 5 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stock insuficiente/i);
  });

  test('agregar un item válido lo incluye en el carrito y luego se refleja en el detalle con su producto', async () => {
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productoId: productoConStock.id, cantidad: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([{ productoId: productoConStock.id, cantidad: 2 }]);

    const detalle = await request(app)
      .get('/api/carrito')
      .set('Authorization', `Bearer ${userToken}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.data.items.length).toBe(1);
    expect(detalle.body.data.items[0].producto.nombre).toBe('Gaseosa');
    expect(detalle.body.data.items[0].cantidad).toBe(2);
  });

  test('agregar el mismo producto de nuevo suma la cantidad en vez de duplicar el item', async () => {
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productoId: productoConStock.id, cantidad: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([{ productoId: productoConStock.id, cantidad: 5 }]);
  });

  test('agregar una cantidad que exceda el stock (sumada a lo ya presente) es rechazado', async () => {
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productoId: productoConStock.id, cantidad: 100 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stock insuficiente/i);
  });

  test('actualizar la cantidad de un item a 0 es rechazado', async () => {
    const res = await request(app)
      .put(`/api/carrito/items/${productoConStock.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cantidad: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cantidad debe ser mayor a 0/i);
  });

  test('actualizar la cantidad de un producto que no está en el carrito devuelve 404', async () => {
    const res = await request(app)
      .put(`/api/carrito/items/${productoSinStock.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cantidad: 1 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no está en el carrito/i);
  });

  test('actualizar la cantidad de un item existente cambia el total de unidades', async () => {
    const res = await request(app)
      .put(`/api/carrito/items/${productoConStock.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cantidad: 4 });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([{ productoId: productoConStock.id, cantidad: 4 }]);
  });

  test('eliminar un item lo quita del carrito', async () => {
    const res = await request(app)
      .delete(`/api/carrito/items/${productoConStock.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  test('vaciar el carrito lo deja vacío incluso si ya tenía items', async () => {
    await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productoId: productoConStock.id, cantidad: 1 });

    const res = await request(app)
      .delete('/api/carrito')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);

    const detalle = await request(app)
      .get('/api/carrito')
      .set('Authorization', `Bearer ${userToken}`);
    expect(detalle.body.data.items).toEqual([]);
  });
});
