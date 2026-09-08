const express = require('express');
const router = express.Router();
const pagosController = require('./pagos.controller');
const { validate, crearSchema } = require('./pagos.validator');
const { verifyToken, checkRoleOrPermission } = require('../../middlewares/auth');
const { createLimiter } = require('../../middlewares/rateLimit');

// ADMIN o el permiso granular pagos.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado (p. ej. un Trabajador que registra abonos desde caja)
// podía usar estas rutas.
router.get('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'pagos.read'), pagosController.listar);
router.get('/mis-pagos', verifyToken, pagosController.misPagos);
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'pagos.write'), createLimiter, validate(crearSchema), pagosController.crear);
router.get('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'pagos.read'), pagosController.verDetalle);
router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'pagos.write'), pagosController.actualizar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'pagos.write'), pagosController.cambiarEstado);
// pagosController.eliminar existía sin ruta que la usara: el permiso
// pagos.delete estaba declarado en PERMISOS_DISPONIBLES pero no había forma
// de llegar a él por HTTP.
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'pagos.delete'), pagosController.eliminar);

module.exports = router;
