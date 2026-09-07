const express = require('express');
const router = express.Router();
const marcasController = require('./marcas.controller');
const { validate, crearSchema, actualizarSchema } = require('./marcas.validator');
const { verifyToken, optionalAuth, checkRoleOrPermission } = require('../../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ruta pública: optionalAuth permite que el staff autenticado también vea
// las inactivas, sin exigir sesión a los visitantes anónimos.
router.get('/', optionalAuth, marcasController.listar);
router.get('/export', marcasController.exportar);

// ADMIN o el permiso granular marcas.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado con marcas.write marcado podía usar estas rutas.
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'marcas.write'), validate(crearSchema), marcasController.crear);

// Importación (debe ir ANTES de /:id)
router.post('/import', verifyToken, checkRoleOrPermission(['ADMIN'], 'marcas.write'), upload.single('file'), marcasController.importar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'marcas.read'), marcasController.verDetalle);
router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'marcas.write'), validate(actualizarSchema), marcasController.actualizar);
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'marcas.delete'), marcasController.eliminar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'marcas.write'), marcasController.cambiarEstado);

module.exports = router;
