const { Usuario, Rol, Proveedor } = require('../models');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendMail } = require('../config/mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res) => {
  try {
    const { nombre, email, password, telefono, apellido, documento, tipoDocumento, genero, direccion, barrio, foto_url } = req.body;

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

    let rolUsuario = await Rol.findOne({ where: { nombre: 'CLIENTE', estado: true } });
    
    if (!rolUsuario) {
      rolUsuario = await Rol.findOne({ where: { nombre: { [require('sequelize').Op.in]: ['CLIENTE', 'USUARIO', 'USUARIO'] }, estado: true } });
    }
    
    if (!rolUsuario) {
      rolUsuario = await Rol.create({
        nombre: 'CLIENTE',
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
      foto_url,
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
        include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }]
      });
    } else if (email) {
      usuario = await Usuario.findOne({ 
        where: { email },
        include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }]
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
      rol: usuario.rol ? usuario.rol.nombre : 'USUARIO',
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
      rol: usuario.rol ? usuario.rol.nombre : 'USUARIO',
      rol_id: usuario.rol ? usuario.rol.id : null,
      proveedor: usuario.proveedorId || null,
      estado: usuario.estado,
      createdAt: usuario.createdAt
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
        { model: Rol, as: 'rol' },
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
      rol: usuario.rol ? usuario.rol.nombre : 'USUARIO',
      rol_id: usuario.rol ? usuario.rol.id : null,
      permisos: usuario.rol ? usuario.rol.permisos : [],
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

exports.forgotPassword = async (req, res) => {
  // Mensaje idéntico sin importar si la cuenta existe o no, para no permitir
  // que alguien use este endpoint para averiguar qué correos están registrados.
  const genericMessage = 'Si el correo está registrado, se ha enviado un enlace de recuperación a esa dirección';

  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return errorResponse(res, 'Ingresa un email válido', 400);
    }

    const usuario = await Usuario.findOne({ where: { email } });

    if (usuario) {
      const resetToken = jwt.sign(
        { documento: usuario.documento, type: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      try {
        await sendMail({
          to: usuario.email,
          subject: 'Recuperación de contraseña - SISGEM',
          html: `
            <p>Hola ${usuario.nombre || ''},</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en SISGEM.</p>
            <p><a href="${resetLink}">Haz clic aquí para crear una nueva contraseña</a></p>
            <p>Este enlace expira en 1 hora. Si tú no solicitaste este cambio, puedes ignorar este correo; tu contraseña seguirá siendo la misma.</p>
          `,
        });
      } catch (mailError) {
        // No se expone el error de envío al cliente: la respuesta sigue siendo genérica.
        console.error('Error enviando email de recuperación:', mailError);
      }
    }

    return successResponse(res, null, genericMessage);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return errorResponse(res, 'Token y nueva contraseña son requeridos', 400);
    }
    
    if (password.length < 6) {
      return errorResponse(res, 'La contraseña debe tener al menos 6 caracteres', 400);
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return errorResponse(res, 'Token expirado o inválido', 400);
    }
    
    if (decoded.type !== 'password-reset') {
      return errorResponse(res, 'Token inválido', 400);
    }
    
    const usuario = await Usuario.findByPk(decoded.documento);
    if (!usuario) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }
    
    usuario.password = password;
    await usuario.save();
    
    return successResponse(res, null, 'Contraseña restablecida correctamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};