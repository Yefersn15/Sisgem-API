const express = require('express');
const router = express.Router();
const marcasController = require('../controllers/marcas.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Rutas públicas (sin autenticación)
router.get('/', marcasController.listar);
router.get('/export', marcasController.exportar);

// Rutas protegidas - ADMIN
router.post('/', verifyToken, checkRole(['ADMIN']), marcasController.crear);

// Importación (debe ir ANTES de /:id)
router.post('/import', verifyToken, checkRole(['ADMIN']), upload.single('file'), marcasController.importar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, checkRole(['ADMIN']), marcasController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), marcasController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), marcasController.eliminar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), marcasController.cambiarEstado);

module.exports = router;
