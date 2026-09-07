const express = require('express');
const router = express.Router();
const bannersController = require('./banners.controller');
const { validate, crearSchema, actualizarSchema } = require('./banners.validator');
const { verifyToken, optionalAuth, checkRoleOrPermission } = require('../../middlewares/auth');

// Ruta pública: optionalAuth permite que el staff autenticado también vea
// los inactivos, sin exigir sesión a los visitantes anónimos.
router.get('/', optionalAuth, bannersController.listar);

// ADMIN o el permiso granular banners.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado con banners.write marcado podía usar estas rutas.
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'banners.write'), validate(crearSchema), bannersController.crear);
router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'banners.write'), validate(actualizarSchema), bannersController.actualizar);
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'banners.delete'), bannersController.eliminar);

module.exports = router;
