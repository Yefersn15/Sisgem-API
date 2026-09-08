// Lógica de negocio y acceso a datos de marcas. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
const repository = require('./marcas.repository');
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

exports.crear = async (data, requester) => {
  const { nombre, descripcion, logo, sitioWeb } = data;

  const existe = await repository.findByNombre(nombre.toUpperCase());
  if (existe) throw new AppError('La marca ya existe', 400);

  return repository.create({
    nombre: nombre.toUpperCase(),
    descripcion,
    logo,
    sitioWeb,
    creadoPorDocumento: requester?.documento || null,
    creadoPorNombre: requester?.nombre || null,
  });
};

exports.obtenerPorId = async (id) => {
  const marca = await repository.findById(id);
  if (!marca) throw new AppError('Marca no encontrada', 404);
  return marca;
};

exports.actualizar = async (id, data) => {
  const { nombre, descripcion, logo, sitioWeb, estado } = data;

  const marca = await repository.findById(id);
  if (!marca) throw new AppError('Marca no encontrada', 404);

  if (nombre && nombre.toUpperCase() !== marca.nombre) {
    const existe = await repository.findByNombre(nombre.toUpperCase());
    if (existe) throw new AppError('La marca ya existe', 400);
  }

  await marca.update({
    nombre: nombre ? nombre.toUpperCase() : marca.nombre,
    descripcion: descripcion !== undefined ? descripcion : marca.descripcion,
    logo: logo !== undefined ? logo : marca.logo,
    sitioWeb: sitioWeb !== undefined ? sitioWeb : marca.sitioWeb,
    estado: estado !== undefined ? estado : marca.estado,
  });

  return marca;
};

exports.eliminar = async (id) => {
  const marca = await repository.findById(id);
  // Nota: mensaje "no encontrado" (masculino), preservado tal cual del
  // controlador original aunque el resto del recurso usa "no encontrada".
  if (!marca) throw new AppError('Marca no encontrado', 404);

  await marca.destroy();
};

exports.cambiarEstado = async (id, estado) => {
  const marca = await repository.findById(id);
  if (!marca) throw new AppError('Marca no encontrada', 404);
  await marca.update({ estado });
  return marca;
};

exports.exportar = async () => {
  return repository.findAllOrdenadas();
};
