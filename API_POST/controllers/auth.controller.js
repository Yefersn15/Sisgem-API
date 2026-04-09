const { Usuario, Rol, Proveedor } = require('../models');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.register = async (req, res) => {
  try {
    const { nombre, email, password, telefono, apellido, documento, tipoDocumento, genero, direccion, barrio } = req.body;

    if (!nombre || !email || !password || !documento) {
      return errorResponse(res, 'Campos requeridos: nombre, email, password, documento', 400);
    }

    const existeUsuario = await Usuario.findOne({ where: { email } });
    if (existeUsuario) {
      return errorResponse(res, 'El email ya está registrado', 400);
    }

    const existeDocumento = await Usuario.findByPk(documento);
    if (existeDocumento) {
      return errorResponse(res, 'El documento ya está registrado', 400);
    }

    let rolUsuario = await Rol.findOne({ where: { esDefault: true, estado: true } });
    
    if (!rolUsuario) {
      rolUsuario = await Rol.findOne({ where: { nombre: { [require('sequelize').Op.in]: ['CLIENTE', 'USUARIO', 'USUARIO'] }, estado: true } });
    }
    
    if (!rolUsuario) {
      rolUsuario = await Rol.create({
        nombre: 'USUARIO',
        descripcion: 'Rol para clientes registrados',
        permisos: ['perfil.read', 'perfil.write', 'pedidos.read'],
        esDefault: true,
        estado: true
      });
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
      rolId: rolUsuario.id
    });

    return successResponse(res, null, 'Usuario registrado exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, documento } = req.body;

    let usuario;
    if (documento) {
      usuario = await Usuario.findOne({ 
        where: { documento },
        include: [{ model: Rol }]
      });
    } else if (email) {
      usuario = await Usuario.findOne({ 
        where: { email },
        include: [{ model: Rol }]
      });
    }
    
    if (!usuario) {
      return errorResponse(res, 'Credenciales inválidas', 400);
    }

    const match = await usuario.comparePassword(password);
    if (!match) {
      return errorResponse(res, 'Credenciales inválidas', 400);
    }

    if (!usuario.estado) {
      return errorResponse(res, 'Usuario inactivo', 403);
    }

    const tokenPayload = { 
      documento: usuario.documento, 
      rol: usuario.Rol ? usuario.Rol.nombre : 'USUARIO',
      nombre: usuario.nombre
    };

    if (usuario.proveedorId) {
      tokenPayload.proveedor = usuario.proveedorId;
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    const usuarioData = {
      documento: usuario.documento,
      tipoDocumento: usuario.tipoDocumento,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.Rol ? usuario.Rol.nombre : 'USUARIO',
      proveedor: usuario.proveedorId || null,
      estado: usuario.estado
    };

    return successResponse(res, { token, usuario: usuarioData }, 'Login exitoso');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.documento, {
      include: [
        { model: Rol },
        { model: Proveedor, as: 'proveedor', attributes: ['nombre'] }
      ]
    });
    
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const usuarioData = {
      documento: usuario.documento,
      tipoDocumento: usuario.tipoDocumento,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      genero: usuario.genero,
      direccion: usuario.direccion,
      barrio: usuario.barrio,
      rol: usuario.Rol ? usuario.Rol.nombre : 'USUARIO',
      proveedor: usuario.proveedorId || null,
      estado: usuario.estado,
      createdAt: usuario.createdAt
    };

    return successResponse(res, usuarioData);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return errorResponse(res, 'La contraseña debe tener al menos 6 caracteres', 400);
    }
    
    const usuario = await Usuario.findByPk(req.user.documento);
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }
    
    usuario.password = password;
    await usuario.save();
    
    return successResponse(res, null, 'Contraseña actualizada correctamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};