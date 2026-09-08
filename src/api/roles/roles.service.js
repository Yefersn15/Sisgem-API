// Lógica de negocio y acceso a datos de roles. No conoce Express
// (nada de req/res) — el controlador es quien traduce esto a HTTP.
const { Usuario } = require('../../models');
const repository = require('./roles.repository');
const AppError = require('../../utils/AppError');

const PERMISOS_DISPONIBLES = [
  'ventas.read', 'ventas.write', 'ventas.delete',
  'pedidos.read', 'pedidos.write', 'pedidos.delete',
  'pagos.read', 'pagos.write', 'pagos.delete',
  'domicilios.read', 'domicilios.write', 'domicilios.delete',
  'productos.read', 'productos.write', 'productos.delete',
  'categorias.read', 'categorias.write', 'categorias.delete',
  'marcas.read', 'marcas.write', 'marcas.delete',
  'banners.read', 'banners.write', 'banners.delete',
  'caja.read', 'caja.write',
  'usuarios.read', 'usuarios.write', 'usuarios.delete',
  'roles.read', 'roles.write', 'roles.delete',
  'config.read', 'config.write',
  'reportes.read'
];

exports.seedRoles = async () => {
  const existingRoles = await repository.findAll();

  if (existingRoles.length === 0) {
    const rolesData = [
      {
        nombre: 'ADMIN',
        descripcion: 'Administrador del sistema con acceso total',
        permisos: PERMISOS_DISPONIBLES,
        esDefault: false,
        estado: true
      },
      {
        nombre: 'USUARIO',
        descripcion: 'Cliente que puede realizar compras',
        permisos: ['perfil.read', 'perfil.write', 'pedidos.read'],
        esDefault: true,
        estado: true
      }
    ];

    for (const role of rolesData) {
      await repository.create(role);
    }

    return { creados: true };
  }

  return { creados: false };
};

exports.listar = async ({ estado, pagination }) => {
  const where = {};

  if (estado !== undefined) {
    where.estado = estado === 'true';
  }

  return repository.findAndCountAll({ where, pagination });
};

exports.crear = async (data) => {
  const { nombre, descripcion, permisos, esDefault, estado } = data;

  const existe = await repository.findByNombre(nombre);
  if (existe) throw new AppError('El rol ya existe', 400);

  return repository.create({
    nombre,
    descripcion,
    permisos: permisos || [],
    esDefault: esDefault || false,
    estado: estado !== undefined ? estado : true
  });
};

exports.obtenerPorId = async (id) => {
  const rol = await repository.findById(id);
  if (!rol) throw new AppError('Rol no encontrado', 404);
  return rol;
};

exports.obtenerPorNombre = async (nombre) => {
  const rol = await repository.findByNombre(nombre);
  if (!rol) throw new AppError('Rol no encontrado', 404);
  return rol;
};

exports.actualizar = async (id, data) => {
  const { nombre, descripcion, permisos, esDefault, estado } = data;

  const rol = await repository.findById(id);
  if (!rol) throw new AppError('Rol no encontrado', 404);

  if (nombre && nombre !== rol.nombre) {
    const existe = await repository.findByNombre(nombre);
    if (existe) throw new AppError('El nombre del rol ya existe', 400);
  }

  await rol.update({
    nombre: nombre || rol.nombre,
    descripcion: descripcion !== undefined ? descripcion : rol.descripcion,
    permisos: permisos !== undefined ? permisos : rol.permisos,
    esDefault: esDefault !== undefined ? esDefault : rol.esDefault,
    estado: estado !== undefined ? estado : rol.estado
  });

  return rol;
};

exports.eliminar = async (id) => {
  const rol = await repository.findById(id);
  if (!rol) throw new AppError('Rol no encontrado', 404);

  if (rol.nombre === 'ADMIN') {
    throw new AppError('No se puede eliminar el rol ADMIN', 400);
  }

  const usuariosConRol = await Usuario.count({ where: { rolId: id } });
  if (usuariosConRol > 0) {
    throw new AppError('No se puede eliminar el rol porque hay usuarios asociados', 400);
  }

  await rol.destroy();
};

exports.cambiarEstado = async (id, estado) => {
  const rol = await repository.findById(id);
  if (!rol) throw new AppError('Rol no encontrado', 404);

  if (rol.nombre === 'ADMIN') {
    throw new AppError('No se puede desactivar el rol ADMIN', 400);
  }

  await rol.update({ estado });
  return rol;
};

exports.listarPermisos = () => PERMISOS_DISPONIBLES;
