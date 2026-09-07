const express = require('express');
const router = express.Router();
const productosController = require('./productos.controller');
const { validate, crearSchema, actualizarSchema } = require('./productos.validator');
const { verifyToken, optionalAuth, checkRoleOrPermission } = require('../../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ruta pública: optionalAuth permite que el staff autenticado también vea
// los inactivos, sin exigir sesión a los visitantes anónimos.
router.get('/', optionalAuth, productosController.listar);

// ADMIN o el permiso granular productos.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado con productos.write marcado podía usar estas rutas.
router.get('/stock-bajo', verifyToken, checkRoleOrPermission(['ADMIN'], 'productos.read'), productosController.stockBajo);
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'productos.write'), validate(crearSchema), productosController.crear);

// Importación / Exportación (deben ir ANTES de /:id)
router.post('/import', verifyToken, checkRoleOrPermission(['ADMIN'], 'productos.write'), upload.single('file'), productosController.importar);
router.get('/export', verifyToken, checkRoleOrPermission(['ADMIN'], 'productos.read'), productosController.exportar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, productosController.verDetalle);
router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'productos.write'), validate(actualizarSchema), productosController.actualizar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'productos.write'), productosController.cambiarEstado);
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'productos.delete'), productosController.eliminar);

module.exports = router;
