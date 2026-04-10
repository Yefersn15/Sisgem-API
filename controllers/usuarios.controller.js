const { Usuario, Rol, Proveedor } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const { Op } = require('sequelize');

exports.listar = async (req, res) => {
  try {
    const { estado, rol, proveedor } = req.query;
    const where = {};

    if (estado !== undefined) {
      where.estado = estado === 'true';
    }

    if (rol) {
      where.rolId = rol;
    }

    if (proveedor) {
      where.proveedorId = proveedor;
    }

    const usuarios = await Usuario.findAll({
      where,
      include: [
        { model: Rol, attributes: ['id', 'nombre'], as: 'rol' },
        { model: Proveedor, attributes: ['id', 'nombre'], as: 'proveedor' }
      ],
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, usuarios);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, email, password, telefono, apellido, rolId, documento, proveedorId, tipoDocumento, genero, direccion, barrio } = req.body;

    const existeUsuario = await Usuario.findOne({ where: { email } });
    if (existeUsuario) {
      return errorResponse(res, 'El email ya está registrado', 400);
    }

    if (documento) {
      const existeDocumento = await Usuario.findByPk(documento);
      if (existeDocumento) {
        return errorResponse(res, 'El documento ya está registrado', 400);
      }
    }

    // Buscar el rol por defecto dinámicamente
    let defaultRolId = rolId;
    if (!defaultRolId) {
      const defaultRol = await Rol.findOne({ where: { esDefault: true, estado: true } });
      defaultRolId = defaultRol ? defaultRol.id : 1;
    }

    const nuevoUsuario = await Usuario.create({
      documento,
      tipoDocumento: tipoDocumento || 'CC',
      nombre,
      apellido,
      email,
      password,
      telefono,
      genero,
      direccion,
      barrio,
      rolId: defaultRolId,
      proveedorId: proveedorId || null
    });

    const usuarioCreado = await Usuario.findByPk(nuevoUsuario.documento, {
      include: [
        { model: Rol, as: 'rol', attributes: ['id', 'nombre'] },
        { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] }
      ],
      attributes: { exclude: ['password'] }
    });

    return successResponse(res, usuarioCreado, 'Usuario creado exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verDetallePorDocumento = async (req, res) => {
  try {
    const { documento } = req.params;

    const usuario = await Usuario.findOne({
      where: { documento },
      include: [
        { model: Rol, attributes: ['nombre'] },
        { model: Proveedor, attributes: ['nombre'], as: 'proveedor' }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    return successResponse(res, usuario);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id, {
      include: [
        { model: Rol, attributes: ['nombre'] },
        { model: Proveedor, attributes: ['nombre'], as: 'proveedor' }
      ],
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    return successResponse(res, usuario);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, rolId, email, proveedorId, tipoDocumento, genero, direccion, barrio, estado } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    if (email && email !== usuario.email) {
      const existeEmail = await Usuario.findOne({ where: { email } });
      if (existeEmail) {
        return errorResponse(res, 'El email ya está en uso', 400);
      }
    }

    await usuario.update({
      nombre: nombre || usuario.nombre,
      apellido: apellido !== undefined ? apellido : usuario.apellido,
      telefono: telefono !== undefined ? telefono : usuario.telefono,
      rolId: rolId || usuario.rolId,
      email: email || usuario.email,
      tipoDocumento: tipoDocumento || usuario.tipoDocumento,
      genero: genero !== undefined ? genero : usuario.genero,
      direccion: direccion !== undefined ? direccion : usuario.direccion,
      barrio: barrio !== undefined ? barrio : usuario.barrio,
      proveedorId: proveedorId !== undefined ? (proveedorId || null) : usuario.proveedorId,
      estado: estado !== undefined ? estado : usuario.estado
    });

    const usuarioActualizado = await Usuario.findByPk(usuario.documento, {
      include: [
        { model: Rol, attributes: ['nombre'] },
        { model: Proveedor, attributes: ['nombre'], as: 'proveedor' }
      ],
      attributes: { exclude: ['password'] }
    });

    return successResponse(res, usuarioActualizado, 'Usuario actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    await usuario.destroy();

    return successResponse(res, null, 'Usuario eliminado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const usuario = await Usuario.findByPk(id, {
      include: [{ model: Rol, attributes: ['nombre'] }],
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    await usuario.update({ estado });

    return successResponse(res, usuario, 'Estado actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.listarDirecciones = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.documento, {
      attributes: ['direcciones']
    });
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }
    return successResponse(res, usuario.direcciones || []);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.agregarDireccion = async (req, res) => {
  try {
    const { nombre, direccion, direccion2, barrio, telefono } = req.body;
    const usuario = await Usuario.findByPk(req.user.documento);
    
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    if (!direccion || !barrio) {
      return errorResponse(res, 'Dirección y barrio son requeridos', 400);
    }

    const direcciones = usuario.direcciones || [];
    
    if (direcciones.length >= 3) {
      return errorResponse(res, 'Máximo 3 direcciones guardadas', 400);
    }

    const existeDireccion = direcciones.some(d => 
      d.direccion.toLowerCase() === direccion.toLowerCase() && 
      d.barrio.toLowerCase() === barrio.toLowerCase()
    );
    if (existeDireccion) {
      return errorResponse(res, 'Esta dirección ya está guardada', 400);
    }

    const esPredeterminada = direcciones.length === 0;

    const nuevaDireccion = {
      nombre: nombre || 'Principal',
      direccion,
      direccion2: direccion2 || '',
      barrio,
      telefono: telefono || '',
      es_predeterminada: esPredeterminada
    };

    direcciones.push(nuevaDireccion);
    await usuario.update({ direcciones });

    return successResponse(res, usuario.direcciones, 'Dirección guardada exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizarDireccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, direccion2, barrio, telefono, es_predeterminada } = req.body;
    const usuario = await Usuario.findByPk(req.user.documento);
    
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const direcciones = usuario.direcciones || [];
    const dirIndex = direcciones.findIndex(d => d.nombre === id || d.nombre === `direccion_${id}`);
    
    if (dirIndex === -1) {
      return errorResponse(res, 'Dirección no encontrada', 404);
    }

    if (direccion && barrio) {
      const existeDireccion = direcciones.some((d, i) => 
        i !== dirIndex && 
        d.direccion.toLowerCase() === direccion.toLowerCase() && 
        d.barrio.toLowerCase() === barrio.toLowerCase()
      );
      if (existeDireccion) {
        return errorResponse(res, 'Esta dirección ya está guardada', 400);
      }
    }

    if (nombre) direcciones[dirIndex].nombre = nombre;
    if (direccion) direcciones[dirIndex].direccion = direccion;
    if (direccion2 !== undefined) direcciones[dirIndex].direccion2 = direccion2;
    if (barrio) direcciones[dirIndex].barrio = barrio;
    if (telefono !== undefined) direcciones[dirIndex].telefono = telefono;
    
    if (es_predeterminada) {
      direcciones.forEach((d, i) => {
        direcciones[i].es_predeterminada = (i === dirIndex);
      });
    }

    await usuario.update({ direcciones });

    return successResponse(res, usuario.direcciones, 'Dirección actualizada exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminarDireccion = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(req.user.documento);
    
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const direcciones = usuario.direcciones || [];
    const dirIndex = direcciones.findIndex(d => d.nombre === id);
    
    if (dirIndex === -1) {
      return errorResponse(res, 'Dirección no encontrada', 404);
    }

    const eraPredeterminada = direcciones[dirIndex].es_predeterminada;
    direcciones.splice(dirIndex, 1);
    
    if (eraPredeterminada && direcciones.length > 0) {
      direcciones[0].es_predeterminada = true;
    }

    await usuario.update({ direcciones });

    return successResponse(res, usuario.direcciones, 'Dirección eliminada exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.direccionPredeterminada = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(req.user.documento);
    
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const direcciones = usuario.direcciones || [];
    const dirIndex = direcciones.findIndex(d => d.nombre === id);
    
    if (dirIndex === -1) {
      return errorResponse(res, 'Dirección no encontrada', 404);
    }

    direcciones.forEach((d, i) => {
      direcciones[i].es_predeterminada = (i === dirIndex);
    });

    await usuario.update({ direcciones });

    return successResponse(res, usuario.direcciones, 'Dirección predeterminada actualizada');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};