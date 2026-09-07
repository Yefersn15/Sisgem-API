// Lógica de negocio de autenticación. No conoce Express.
const jwt = require('jsonwebtoken');
const repository = require('./auth.repository');
const sendEmail = require('../../utils/sendEmail');
const AppError = require('../../utils/AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (data) => {
  const { nombre, email, password, telefono, apellido, documento, tipoDocumento, genero, direccion, barrio, fotoUrl } = data;

  if (!nombre || !email || !password || !documento) {
    throw new AppError('Campos requeridos: nombre, email, password, documento', 400);
  }

  const existeUsuario = await repository.findUsuarioByEmail(email);
  if (existeUsuario) {
    throw new AppError('El email ya está registrado', 400);
  }

  const existeDocumento = await repository.findUsuarioById(documento);
  if (existeDocumento) {
    throw new AppError('El documento ya está registrado', 400);
  }

  let rolUsuario = await repository.findRolActivoPorNombre('CLIENTE');

  if (!rolUsuario) {
    rolUsuario = await repository.findRolActivoPorNombres(['CLIENTE', 'USUARIO']);
  }

  if (!rolUsuario) {
    rolUsuario = await repository.crearRol({
      nombre: 'CLIENTE',
      descripcion: 'Rol para clientes registrados',
      permisos: ['perfil.read', 'perfil.write', 'pedidos.read'],
      esDefault: true,
      estado: true
    });
  }

  await repository.crearUsuario({
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
    fotoUrl,
    rolId: rolUsuario.id
  });
};

exports.login = async ({ email, documento, password }) => {
  let usuario;
  if (documento) {
    usuario = await repository.findUsuarioByDocumentoConRol(documento);
  } else if (email) {
    usuario = await repository.findUsuarioByEmailConRol(email);
  }

  if (!usuario) {
    throw new AppError('Credenciales inválidas', 400);
  }

  const match = await usuario.comparePassword(password);
  if (!match) {
    throw new AppError('Credenciales inválidas', 400);
  }

  if (!usuario.estado) {
    throw new AppError('Usuario inactivo', 403);
  }

  const tokenPayload = {
    documento: usuario.documento,
    rol: usuario.rol ? usuario.rol.nombre : 'USUARIO',
    nombre: usuario.nombre
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

  const usuarioData = {
    documento: usuario.documento,
    tipoDocumento: usuario.tipoDocumento,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol ? usuario.rol.nombre : 'USUARIO',
    rol_id: usuario.rol ? usuario.rol.id : null,
    estado: usuario.estado,
    fotoUrl: usuario.fotoUrl,
    esAdminPrincipal: usuario.esAdminPrincipal,
    createdAt: usuario.createdAt
  };

  return { token, usuario: usuarioData };
};

exports.getMe = async (documento) => {
  const usuario = await repository.findUsuarioByIdConRol(documento);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return {
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
    estado: usuario.estado,
    fotoUrl: usuario.fotoUrl,
    esAdminPrincipal: usuario.esAdminPrincipal,
    createdAt: usuario.createdAt
  };
};

exports.changePassword = async (documento, { currentPassword, password }) => {
  if (!currentPassword) {
    throw new AppError('Debe ingresar la contraseña actual', 400);
  }
  if (!password || password.length < 6) {
    throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
  }

  const usuario = await repository.findUsuarioById(documento);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  if (usuario.esAdminPrincipal) {
    throw new AppError('La cuenta del administrador principal no puede cambiar su contraseña desde la aplicación. Usa "npm run seed:db" en el servidor.', 403);
  }

  const match = await usuario.comparePassword(currentPassword);
  if (!match) {
    throw new AppError('La contraseña actual es incorrecta', 400);
  }

  usuario.password = password;
  await usuario.save();
};

// Mensaje idéntico sin importar si la cuenta existe o no, para no permitir
// que alguien use este endpoint para averiguar qué correos están registrados.
const GENERIC_FORGOT_MESSAGE = 'Si el correo está registrado, se ha enviado un enlace de recuperación a esa dirección';

exports.forgotPassword = async (email) => {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new AppError('Ingresa un email válido', 400);
  }

  const usuario = await repository.findUsuarioByEmail(email);

  // Igual que "el correo no existe": la cuenta del administrador principal
  // no puede restablecer su contraseña por este medio, así que ni se le
  // envía el correo (misma respuesta genérica, para no revelar que existe).
  if (usuario && !usuario.esAdminPrincipal) {
    const resetToken = jwt.sign({ documento: usuario.documento, type: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
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

  return GENERIC_FORGOT_MESSAGE;
};

exports.resetPassword = async ({ token, password }) => {
  if (!token || !password) {
    throw new AppError('Token y nueva contraseña son requeridos', 400);
  }
  if (password.length < 6) {
    throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    throw new AppError('Token expirado o inválido', 400);
  }

  if (decoded.type !== 'password-reset') {
    throw new AppError('Token inválido', 400);
  }

  const usuario = await repository.findUsuarioById(decoded.documento);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  if (usuario.esAdminPrincipal) {
    throw new AppError('La cuenta del administrador principal no puede restablecer su contraseña por este medio.', 403);
  }

  usuario.password = password;
  await usuario.save();
};
