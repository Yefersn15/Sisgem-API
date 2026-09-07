const express = require('express');
const router = express.Router();
const controller = require('./configuracion.controller');
const { validate, actualizarSchema } = require('./configuracion.validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth');

// Pública: la consumen Header/Footer/Home de cualquier visitante.
router.get('/', controller.obtener);

// Protegida por permiso (no por rol fijo): cualquier rol con config.write
// puede editarla, igual que el resto de módulos administrables.
router.put('/', verifyToken, checkPermission('config.write'), validate(actualizarSchema), controller.actualizar);

module.exports = router;
