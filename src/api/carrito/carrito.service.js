// Lógica de negocio y acceso a datos del carrito. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
// El carrito vive en memoria (no en la base de datos), indexado por
// documento de usuario.
const repository = require('./carrito.repository');
const AppError = require('../../utils/AppError');

const memoriaCarritos = new Map();

exports.obtenerCarrito = async (usuarioId) => {
  const carrito = memoriaCarritos.get(usuarioId) || [];

  const itemsConProducto = [];
  for (const item of carrito) {
    const producto = await repository.findProductoById(item.productoId);
    if (producto && producto.estado) {
      itemsConProducto.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          precio: parseFloat(producto.precio) || 0,
          imagen: producto.imagen,
          stock: producto.stock
        }
      });
    }
  }

  return { items: itemsConProducto };
};

exports.agregarItem = async (usuarioId, { productoId, cantidad = 1 }) => {
  if (!productoId) throw new AppError('ID de producto requerido', 400);

  const producto = await repository.findProductoById(productoId);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  if (!producto.estado) throw new AppError('Producto no disponible', 400);
  if (producto.stock < cantidad) throw new AppError('Stock insuficiente', 400);

  let carrito = memoriaCarritos.get(usuarioId) || [];

  const itemIndex = carrito.findIndex((item) => item.productoId === parseInt(productoId));
  if (itemIndex > -1) {
    const nuevaCantidad = carrito[itemIndex].cantidad + cantidad;
    if (nuevaCantidad > producto.stock) {
      throw new AppError('Stock insuficiente', 400);
    }
    carrito[itemIndex].cantidad = nuevaCantidad;
  } else {
    carrito.push({ productoId: parseInt(productoId), cantidad });
  }

  memoriaCarritos.set(usuarioId, carrito);

  return { items: carrito };
};

exports.actualizarItem = async (usuarioId, productoId, cantidad) => {
  if (!cantidad || cantidad < 1) throw new AppError('Cantidad debe ser mayor a 0', 400);

  const producto = await repository.findProductoById(productoId);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  if (producto.stock < cantidad) throw new AppError('Stock insuficiente', 400);

  let carrito = memoriaCarritos.get(usuarioId) || [];

  const itemIndex = carrito.findIndex((item) => item.productoId === parseInt(productoId));
  if (itemIndex === -1) throw new AppError('Producto no está en el carrito', 404);

  carrito[itemIndex].cantidad = cantidad;
  memoriaCarritos.set(usuarioId, carrito);

  return { items: carrito };
};

exports.eliminarItem = async (usuarioId, productoId) => {
  let carrito = memoriaCarritos.get(usuarioId) || [];
  carrito = carrito.filter((item) => item.productoId !== parseInt(productoId));
  memoriaCarritos.set(usuarioId, carrito);
  return { items: carrito };
};

exports.vaciarCarrito = async (usuarioId) => {
  memoriaCarritos.set(usuarioId, []);
  return { items: [] };
};
