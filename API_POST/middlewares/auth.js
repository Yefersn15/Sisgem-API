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

    if (Array.isArray(roles) && roles.every(r => typeof r === 'string')) {
      try {
        const usuario = await Usuario.findByPk(req.user.documento, {
          include: [{ model: Rol }]
        });
        
        if (!usuario || !usuario.Rol) {
          return res.status(403).json({ message: 'Usuario o rol no encontrado' });
        }
        
        if (usuario.Rol.nombre === 'ADMIN') {
          return next();
        }
        
        if (!roles.includes(usuario.Rol.nombre)) {
          return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
        }
        next();
      } catch (error) {
        return res.status(500).json({ message: 'Error al verificar rol' });
      }
    }
    
    next();
  };
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Acceso denegado. Autentícate primero' });
    }

    try {
      const usuario = await Usuario.findByPk(req.user.documento, {
        include: [{ model: Rol }]
      });
      
      if (!usuario || !usuario.Rol) {
        return res.status(403).json({ message: 'Usuario o rol no encontrado' });
      }

      if (usuario.Rol.nombre === 'ADMIN') {
        return next();
      }

      const permisos = usuario.Rol.permisos || [];
      
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
          include: [{ model: Rol }]
        });
        
        if (!usuario || !usuario.Rol) {
          return res.status(403).json({ message: 'Usuario o rol no encontrado' });
        }

        const permisos = usuario.Rol.permisos || [];
        
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

module.exports = {
  verifyToken,
  checkRole,
  checkPermission,
  checkRoleOrPermission
};