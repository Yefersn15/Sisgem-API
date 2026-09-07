const express = require('express');
const router = express.Router();
const categoriasController = require('./categorias.controller');
const { validate, crearSchema, actualizarSchema } = require('./categorias.validator');
const { verifyToken, optionalAuth, checkRoleOrPermission } = require('../../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ruta pública: optionalAuth permite que el staff autenticado también vea
// las inactivas, sin exigir sesión a los visitantes anónimos.
router.get('/', optionalAuth, categoriasController.listar);
router.get('/export', categoriasController.exportar);

// ADMIN o el permiso granular categorias.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado con categorias.write marcado podía usar estas rutas.
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'categorias.write'), validate(crearSchema), categoriasController.crear);

// Importación (debe ir ANTES de /:id)
router.post('/import', verifyToken, checkRoleOrPermission(['ADMIN'], 'categorias.write'), upload.single('file'), categoriasController.importar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'categorias.read'), categoriasController.verDetalle);
router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'categorias.write'), validate(actualizarSchema), categoriasController.actualizar);
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'categorias.delete'), categoriasController.eliminar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'categorias.write'), categoriasController.cambiarEstado);

module.exports = router;
