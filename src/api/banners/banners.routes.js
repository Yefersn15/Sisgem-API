const express = require('express');
const router = express.Router();
const bannersController = require('./banners.controller');
const { validate, crearSchema, actualizarSchema } = require('./banners.validator');
const { verifyToken, optionalAuth, checkRole } = require('../../middlewares/auth');

// Ruta pública: optionalAuth permite que el staff autenticado también vea
// los inactivos, sin exigir sesión a los visitantes anónimos.
router.get('/', optionalAuth, bannersController.listar);

// Rutas protegidas - Solo ADMIN
router.post('/', verifyToken, checkRole(['ADMIN']), validate(crearSchema), bannersController.crear);
router.put('/:id', verifyToken, checkRole(['ADMIN']), validate(actualizarSchema), bannersController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), bannersController.eliminar);

module.exports = router;
