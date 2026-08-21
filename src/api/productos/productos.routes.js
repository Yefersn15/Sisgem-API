const express = require('express');
const router = express.Router();
const productosController = require('./productos.controller');
const { validate, crearSchema, actualizarSchema } = require('./productos.validator');
const { verifyToken, optionalAuth, checkRole } = require('../../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ruta pública: optionalAuth permite que el staff autenticado también vea
// los inactivos, sin exigir sesión a los visitantes anónimos.
router.get('/', optionalAuth, productosController.listar);

// Rutas protegidas - ADMIN puede crear
router.get('/stock-bajo', verifyToken, checkRole(['ADMIN']), productosController.stockBajo);
router.post('/', verifyToken, checkRole(['ADMIN']), validate(crearSchema), productosController.crear);

// Importación / Exportación (deben ir ANTES de /:id)
router.post('/import', verifyToken, checkRole(['ADMIN']), upload.single('file'), productosController.importar);
router.get('/export', verifyToken, checkRole(['ADMIN']), productosController.exportar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, productosController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), validate(actualizarSchema), productosController.actualizar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), productosController.cambiarEstado);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), productosController.eliminar);

module.exports = router;
