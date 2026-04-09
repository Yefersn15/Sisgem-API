const express = require('express');
const router = express.Router();
const ordenesCompraController = require('../controllers/ordenesCompra.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Rutas protegidas - Solo ADMIN
router.get('/', verifyToken, checkRole(['ADMIN']), ordenesCompraController.listar);
router.post('/', verifyToken, checkRole(['ADMIN']), ordenesCompraController.crear);
router.get('/:id', verifyToken, checkRole(['ADMIN']), ordenesCompraController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), ordenesCompraController.actualizar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), ordenesCompraController.cambiarEstado);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), ordenesCompraController.eliminar);
router.post('/verificar-productos', verifyToken, checkRole(['ADMIN']), ordenesCompraController.verificarProductosExistentes);
router.post('/pedir-mas-stock', verifyToken, checkRole(['ADMIN']), ordenesCompraController.pedirMasStock);

module.exports = router;
