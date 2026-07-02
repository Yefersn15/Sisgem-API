const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categorias.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Rutas públicas (sin autenticación)
router.get('/', categoriasController.listar);
router.get('/export', categoriasController.exportar);

// Rutas protegidas - Solo ADMIN
router.post('/', verifyToken, checkRole(['ADMIN']), categoriasController.crear);

// Importación (debe ir ANTES de /:id)
router.post('/import', verifyToken, checkRole(['ADMIN']), upload.single('file'), categoriasController.importar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, checkRole(['ADMIN']), categoriasController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), categoriasController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), categoriasController.eliminar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), categoriasController.cambiarEstado);

module.exports = router;
