const { Rol, Usuario } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const PERMISOS_DISPONIBLES = [
  'ventas.read', 'ventas.write', 'ventas.delete',
  'pedidos.read', 'pedidos.write', 'pedidos.delete',
  'pagos.read', 'pagos.write', 'pagos.delete',
  'domicilios.read', 'domicilios.write', 'domicilios.delete',
  'productos.read', 'productos.write', 'productos.delete',
  'categorias.read', 'categorias.write', 'categorias.delete',
  'marcas.read', 'marcas.write', 'marcas.delete',
  'usuarios.read', 'usuarios.write', 'usuarios.delete',
  'roles.read', 'roles.write', 'roles.delete',
  'config.read', 'config.write',
  'reportes.read'
];

exports.seedRoles = async (req, res) => {
  try {
    const existingRoles = await Rol.findAll();
    
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
        await Rol.create(role);
      }

      return successResponse(res, null, 'Roles creados exitosamente', 201);
    }

    return successResponse(res, null, 'Los roles ya existen');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.listar = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};

    if (estado !== undefined) {
      where.estado = estado === 'true';
    }

    const roles = await Rol.findAll({ where, order: [['nombre', 'ASC']] });
    return successResponse(res, roles);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, descripcion, permisos, esDefault, estado } = req.body;

    const existe = await Rol.findOne({ where: { nombre } });
    if (existe) {
      return errorResponse(res, 'El rol ya existe', 400);
    }

    const nuevoRol = await Rol.create({
      nombre,
      descripcion,
      permisos: permisos || [],
      esDefault: esDefault || false,
      estado: estado !== undefined ? estado : true
    });

    return successResponse(res, nuevoRol, 'Rol creado exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    return successResponse(res, rol);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verPorNombre = async (req, res) => {
  try {
    const { nombre } = req.params;

    const rol = await Rol.findOne({ where: { nombre } });
    if (!rol) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    return successResponse(res, rol);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, permisos, esDefault, estado } = req.body;

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    if (nombre && nombre !== rol.nombre) {
      const existe = await Rol.findOne({ where: { nombre } });
      if (existe) {
        return errorResponse(res, 'El nombre del rol ya existe', 400);
      }
    }

    await rol.update({
      nombre: nombre || rol.nombre,
      descripcion: descripcion !== undefined ? descripcion : rol.descripcion,
      permisos: permisos !== undefined ? permisos : rol.permisos,
      esDefault: esDefault !== undefined ? esDefault : rol.esDefault,
      estado: estado !== undefined ? estado : rol.estado
    });

    return successResponse(res, rol, 'Rol actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    if (rol.nombre === 'ADMIN') {
      return errorResponse(res, 'No se puede eliminar el rol ADMIN', 400);
    }

    const usuariosConRol = await Usuario.count({ where: { rolId: id } });
    if (usuariosConRol > 0) {
      return errorResponse(res, 'No se puede eliminar el rol porque hay usuarios用它', 400);
    }

    await rol.destroy();

    return successResponse(res, null, 'Rol eliminado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    if (rol.nombre === 'ADMIN') {
      return errorResponse(res, 'No se puede desactivar el rol ADMIN', 400);
    }

    await rol.update({ estado });

    return successResponse(res, rol, 'Estado actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.listarPermisos = async (req, res) => {
  return successResponse(res, PERMISOS_DISPONIBLES);
};