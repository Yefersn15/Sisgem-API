const jwt = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');
const { errorResponse } = require('../utils/helpers');

// Para rutas públicas que además quieren distinguir "visitante anónimo" de
// "staff autenticado" (por ejemplo, para mostrar también los inactivos a
// ADMIN/EMPLEADO). A diferencia de verifyToken, NUNCA rechaza la solicitud:
// si no hay token o es inválido, sigue como anónimo (req.user queda undefined).
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Token inválido o expirado: continuar como anónimo en vez de fallar.
  }
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return errorResponse(res, 'Se requiere autenticación para acceder a este recurso.', 401);
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return errorResponse(res, 'Token inválido o expirado.', 401);
  }
};

const checkRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Se requiere autenticación para acceder a este recurso.', 401);
    }

    // Use role from JWT token (set at login)
    const userRole = req.user.rol;
    if (!userRole) {
      return errorResponse(res, 'Usuario o rol no encontrado', 403);
    }

    // ADMIN/ADMINISTRADOR always allowed
    if (userRole === 'ADMIN' || userRole === 'ADMINISTRADOR') {
      return next();
    }

    // Check against allowed roles
    if (Array.isArray(roles) && roles.includes(userRole)) {
      return next();
    }

    return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
  };
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Se requiere autenticación para acceder a este recurso.', 401);
    }

    try {
      const usuario = await Usuario.findByPk(req.user.documento, {
        include: [{ model: Rol, as: 'rol' }]
      });

      if (!usuario || !usuario.rol) {
        return errorResponse(res, 'Usuario o rol no encontrado', 403);
      }

      if (usuario.rol.nombre === 'ADMIN' || usuario.rol.nombre === 'ADMINISTRADOR') {
        return next();
      }

      const permisos = usuario.rol.permisos || [];

      if (!permisos.includes(permission)) {
        return errorResponse(res, `No tienes permiso para realizar esta acción. Se requiere: ${permission}`, 403);
      }

      next();
    } catch (error) {
      console.error('Error en checkPermission:', error);
      return errorResponse(res, 'Error al verificar permisos', 500);
    }
  };
};

const checkRoleOrPermission = (roles, permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Se requiere autenticación para acceder a este recurso.', 401);
    }

    if (roles.includes(req.user.rol)) {
      return next();
    }

    if (permission) {
      try {
        const usuario = await Usuario.findByPk(req.user.documento, {
          include: [{ model: Rol, as: 'rol' }]
        });

        if (!usuario || !usuario.rol) {
          return errorResponse(res, 'Usuario o rol no encontrado', 403);
        }

        const permisos = usuario.rol.permisos || [];

        if (permisos.includes(permission)) {
          return next();
        }
      } catch (error) {
        return errorResponse(res, 'Error al verificar permisos', 500);
      }
    }

    return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
  };
};

// Middleware para permitir que el propio usuario se actualice o admin
const allowSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Se requiere autenticación para acceder a este recurso.', 401);
  }

  const targetDocumento = req.params.id;
  const currentDocumento = req.user.documento;
  const userRol = req.user.rol;

  if (userRol === 'ADMIN' || targetDocumento === currentDocumento) {
    return next();
  }

  return errorResponse(res, 'No autorizado para modificar este usuario', 403);
};

module.exports = {
  verifyToken,
  optionalAuth,
  checkRole,
  checkPermission,
  checkRoleOrPermission,
  allowSelfOrAdmin
};