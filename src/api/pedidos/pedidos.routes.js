const express = require('express');
const router = express.Router();
const pedidosController = require('./pedidos.controller');
const { validate, crearSchema } = require('./pedidos.validator');
const { verifyToken, checkRoleOrPermission } = require('../../middlewares/auth');
const { createLimiter } = require('../../middlewares/rateLimit');

// ADMIN o el permiso granular pedidos.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado (p. ej. un Trabajador con pedidos.write para aprobar/
// rechazar abonos desde caja) podía usar estas rutas.
router.get('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.read'), pedidosController.listarPedidos);
router.get('/ventas', verifyToken, checkRoleOrPermission(['ADMIN'], 'ventas.read'), pedidosController.listarVentas);
router.get('/mis-pedidos', verifyToken, pedidosController.misPedidos);
router.post('/', verifyToken, createLimiter, validate(crearSchema), pedidosController.crear);
router.get('/:id', verifyToken, pedidosController.verDetalle);
router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.write'), pedidosController.actualizar);
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.delete'), pedidosController.cancelar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.write'), pedidosController.cambiarEstadoPedido);
router.post('/:id/convertir-venta', verifyToken, checkRoleOrPermission(['ADMIN'], 'ventas.write'), pedidosController.convertirAVenta);
router.patch('/:id/aprobar-abono', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.write'), pedidosController.aprobarAbono);
router.patch('/:id/aprobar', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.write'), pedidosController.aprobarAbono);
router.patch('/:id/rechazar-abono', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.write'), pedidosController.rechazarAbono);
router.patch('/:id/rechazar', verifyToken, checkRoleOrPermission(['ADMIN'], 'pedidos.write'), pedidosController.rechazarAbono);

module.exports = router;
