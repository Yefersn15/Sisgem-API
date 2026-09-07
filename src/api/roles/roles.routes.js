const express = require('express');
const router = express.Router();
const rolesController = require('./roles.controller');
const { validate, crearSchema, actualizarSchema } = require('./roles.validator');
const { verifyToken, checkRoleOrPermission } = require('../../middlewares/auth');

// Ruta pública para obtener rol por nombre (sin autenticación)
router.get('/nombre/:nombre', rolesController.verPorNombre);

// Ruta pública para listar permisos disponibles
router.get('/permisos', rolesController.listarPermisos);

// Ruta pública para crear roles por defecto (solo si no existen) - sin auth
router.post('/seed', rolesController.seedRoles);

// ADMIN o el permiso granular roles.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado con roles.write marcado podía usar estas rutas.
router.get('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'roles.read'), rolesController.listar);
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'roles.write'), validate(crearSchema), rolesController.crear);

// Ruta protegida - usuario autenticado puede ver detalle de cualquier rol
router.get('/:id', verifyToken, rolesController.verDetalle);

router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'roles.write'), validate(actualizarSchema), rolesController.actualizar);
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'roles.delete'), rolesController.eliminar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'roles.write'), rolesController.cambiarEstado);

module.exports = router;
