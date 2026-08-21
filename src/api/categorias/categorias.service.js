// Lógica de negocio y acceso a datos de categorías. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
const { Producto } = require('../../models');
const repository = require('./categorias.repository');
const AppError = require('../../utils/AppError');

exports.listar = async ({ isStaff, estado, pagination }) => {
  const where = {};

  if (!isStaff) {
    where.estado = true;
  } else if (estado !== undefined) {
    where.estado = estado === 'true';
  }

  return repository.findAndCountAll({ where, pagination });
};

exports.crear = async (data) => {
  const { nombre, descripcion } = data;

  const existeCategoria = await repository.findByNombre(nombre.toUpperCase());
  if (existeCategoria) throw new AppError('La categoría ya existe', 400);

  return repository.create({
    nombre: nombre.toUpperCase(),
    descripcion,
  });
};

exports.obtenerPorId = async (id) => {
  const categoria = await repository.findById(id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);
  return categoria;
};

exports.actualizar = async (id, data) => {
  const { nombre, descripcion, estado } = data;

  const categoria = await repository.findById(id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);

  if (nombre && nombre.toUpperCase() !== categoria.nombre) {
    const existe = await repository.findByNombre(nombre.toUpperCase());
    if (existe) throw new AppError('La categoría ya existe', 400);
  }

  await categoria.update({
    nombre: nombre ? nombre.toUpperCase() : categoria.nombre,
    descripcion: descripcion !== undefined ? descripcion : categoria.descripcion,
    estado: estado !== undefined ? estado : categoria.estado,
  });

  return categoria;
};

exports.eliminar = async (id) => {
  const categoria = await repository.findById(id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);

  const productos = await Producto.count({ where: { categoriaId: id } });
  if (productos > 0) throw new AppError('No se puede eliminar la categoría porque tiene productos asociados', 400);

  await categoria.destroy();
};

exports.cambiarEstado = async (id, estado) => {
  const categoria = await repository.findById(id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);
  await categoria.update({ estado });
  return categoria;
};

exports.exportar = async () => {
  return repository.findAllOrdenadas();
};
