const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Rutas protegidas - Solo ADMIN
router.get('/', verifyToken, checkRole(['ADMIN']), pagosController.listar);
router.get('/mis-pagos', verifyToken, pagosController.misPagos);
router.post('/', verifyToken, checkRole(['ADMIN']), pagosController.crear);
router.get('/:id', verifyToken, checkRole(['ADMIN']), pagosController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), pagosController.actualizar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), pagosController.cambiarEstado);

module.exports = router;
