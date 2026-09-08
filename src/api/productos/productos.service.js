// Lógica de negocio y acceso a datos de productos. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
const { Op } = require('sequelize');
const { Categoria, Marca } = require('../../models');
const repository = require('./productos.repository');
const AppError = require('../../utils/AppError');

exports.listar = async ({ isStaff, estado, categoria, marca, search, pagination }) => {
  const where = {};

  if (!isStaff) {
    where.estado = true;
  } else if (estado !== undefined) {
    where.estado = estado === 'true';
  }

  if (categoria) where.categoriaId = categoria;
  if (marca) where.marcaId = marca;
  if (search) where.nombre = { [Op.iLike]: `%${search}%` };

  return repository.findAndCountAll({ where, pagination });
};

exports.crear = async (data, requester) => {
  const { categoriaId, marcaId } = data;

  if (categoriaId) {
    const categoria = await Categoria.findByPk(categoriaId);
    if (!categoria) throw new AppError('Categoría no válida', 400);
  }
  if (marcaId) {
    const marca = await Marca.findByPk(marcaId);
    if (!marca) throw new AppError('Marca no válida', 400);
  }

  const nuevo = await repository.create({
    nombre: data.nombre,
    descripcion: data.descripcion,
    precio: data.precio,
    stock: data.stock || 0,
    imagen: data.imagen,
    categoriaId: categoriaId || 1,
    marcaId: marcaId || 1,
    estado: data.estado !== undefined ? data.estado : true,
    stockMinimo: data.stockMinimo || 0,
    precioCompra: data.precioCompra,
    codigoBarras: data.codigoBarras,
    creadoPorDocumento: requester?.documento || null,
    creadoPorNombre: requester?.nombre || null,
  });

  return repository.findByIdConRelaciones(nuevo.id);
};

exports.obtenerPorId = async (id) => {
  const producto = await repository.findByIdConRelaciones(id);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  return producto;
};

exports.actualizar = async (id, data) => {
  const producto = await repository.findById(id);
  if (!producto) throw new AppError('Producto no encontrado', 404);

  const campos = ['nombre', 'descripcion', 'precio', 'stock', 'imagen', 'categoriaId', 'marcaId', 'estado', 'stockMinimo', 'precioCompra', 'codigoBarras'];
  const updates = {};
  for (const campo of campos) {
    if (data[campo] !== undefined) updates[campo] = data[campo];
  }
  await producto.update(updates);

  return repository.findByIdConRelaciones(id);
};

exports.eliminar = async (id) => {
  const producto = await repository.findById(id);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  await producto.destroy();
};

exports.cambiarEstado = async (id, estado) => {
  const producto = await repository.findById(id);
  if (!producto) throw new AppError('Producto no encontrado', 404);
  await producto.update({ estado });
  return producto;
};

exports.stockBajo = async () => {
  return repository.findStockBajo();
};

exports.exportar = async () => {
  return repository.findAllConRelaciones();
};
