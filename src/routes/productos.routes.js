const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Rutas públicas (sin autenticación)
router.get('/', productosController.listar);

// Rutas protegidas - ADMIN y PROVEEDOR pueden crear
router.get('/stock-bajo', verifyToken, checkRole(['ADMIN']), productosController.stockBajo);
router.post('/', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), productosController.crear);

// Importación / Exportación (deben ir ANTES de /:id)
router.post('/import', verifyToken, checkRole(['ADMIN']), upload.single('file'), productosController.importar);
router.get('/export', verifyToken, checkRole(['ADMIN']), productosController.exportar);

// Rutas con parámetro ID (deben ir después)
router.get('/:id', verifyToken, productosController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), productosController.actualizar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), productosController.cambiarEstado);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), productosController.eliminar);

module.exports = router;