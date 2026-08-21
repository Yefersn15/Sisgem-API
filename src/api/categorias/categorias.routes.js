const express = require('express');
const router = express.Router();
const categoriasController = require('./categorias.controller');
const { validate, crearSchema, actualizarSchema } = require('./categorias.validator');
const { verifyToken, optionalAuth, checkRole } = require('../../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ruta pública: optionalAuth permite que el staff autenticado también vea
// las inactivas, sin exigir sesión a los visitantes anónimos.
router.get('/', optionalAuth, categoriasController.listar);
router.get('/export', categoriasController.exportar);

// Rutas protegidas - Solo ADMIN
router.post('/', verifyToken, checkRole(['ADMIN']), validate(crearSchema), categoriasController.crear);

// Importación (debe ir ANTES de /:id)
router.post('/import', verifyToken, checkRole(['ADMIN']), upload.single('file'), categoriasController.importar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, checkRole(['ADMIN']), categoriasController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), validate(actualizarSchema), categoriasController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), categoriasController.eliminar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), categoriasController.cambiarEstado);

module.exports = router;
