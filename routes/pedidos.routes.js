const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.get('/', verifyToken, checkRole(['ADMIN']), pedidosController.listarPedidos); // pedidos activos - solo ADMIN
router.get('/ventas', verifyToken, checkRole(['ADMIN']), pedidosController.listarVentas); // ventas - solo ADMIN
router.get('/mis-pedidos', verifyToken, pedidosController.misPedidos);
router.post('/', verifyToken, pedidosController.crear);
router.get('/:id', verifyToken, pedidosController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), pedidosController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), pedidosController.cancelar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), pedidosController.cambiarEstadoPedido);
router.post('/:id/convertir-venta', verifyToken, checkRole(['ADMIN']), pedidosController.convertirAVenta);
router.patch('/:id/aprobar-abono', verifyToken, checkRole(['ADMIN']), pedidosController.aprobarSolicitudAbono);
router.patch('/:id/aprobar', verifyToken, checkRole(['ADMIN']), pedidosController.aprobarPedido);

module.exports = router;
