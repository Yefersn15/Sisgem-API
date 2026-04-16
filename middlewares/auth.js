const jwt = require('jsonwebtoken');
const { Usuario, Rol } = require('../models');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(400).json({ message: 'Token inválido' });
  }
};

const checkRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Acceso denegado. Autentícate primero' });
    }

    // Use role from JWT token (set at login)
    const userRole = req.user.rol;
    if (!userRole) {
      return res.status(403).json({ message: 'Usuario o rol no encontrado' });
    }

    // ADMIN/ADMINISTRADOR always allowed
    if (userRole === 'ADMIN' || userRole === 'ADMINISTRADOR') {
      return next();
    }

    // Check against allowed roles
    if (Array.isArray(roles) && roles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
  };
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Acceso denegado. Autentícate primero' });
    }

    try {
      const usuario = await Usuario.findByPk(req.user.documento, {
        include: [{ model: Rol, as: 'rol' }]
      });
      
      if (!usuario || !usuario.rol) {
        return res.status(403).json({ message: 'Usuario o rol no encontrado' });
      }

      if (usuario.rol.nombre === 'ADMIN' || usuario.rol.nombre === 'ADMINISTRADOR') {
        return next();
      }

      const permisos = usuario.rol.permisos || [];
      
      if (!permisos.includes(permission)) {
        return res.status(403).json({ 
          message: `No tienes permiso para realizar esta acción. Se requiere: ${permission}`,
          permiso_requerido: permission
        });
      }

      next();
    } catch (error) {
      console.error('Error en checkPermission:', error);
      return res.status(500).json({ message: 'Error al verificar permisos' });
    }
  };
};

const checkRoleOrPermission = (roles, permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Acceso denegado. Autentícate primero' });
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
          return res.status(403).json({ message: 'Usuario o rol no encontrado' });
        }

        const permisos = usuario.rol.permisos || [];
        
        if (permisos.includes(permission)) {
          return next();
        }
      } catch (error) {
        return res.status(500).json({ message: 'Error al verificar permisos' });
      }
    }

    return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
  };
};

// Middleware para permitir que el propio usuario se actualice o admin
const allowSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Acceso denegado. Autentícate primero' });
  }
  
  const targetDocumento = req.params.id;
  const currentDocumento = req.user.documento;
  const userRol = req.user.rol;
  
  if (userRol === 'ADMIN' || targetDocumento === currentDocumento) {
    return next();
  }
  
  return res.status(403).json({ message: 'No autorizado para modificar este usuario' });
};

module.exports = {
  verifyToken,
  checkRole,
  checkPermission,
  checkRoleOrPermission,
  allowSelfOrAdmin
};