const express = require('express');
const router = express.Router();
const domiciliosController = require('./domicilios.controller');
const { validate, crearSchema } = require('./domicilios.validator');
const { verifyToken, checkRoleOrPermission, checkPermission } = require('../../middlewares/auth');
const { createLimiter } = require('../../middlewares/rateLimit');

// ADMIN o el permiso granular domicilios.* del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado (p. ej. un Trabajador con domicilios.write para asignar
// repartidor desde caja) podía usar ninguna de estas rutas.
router.get('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.read'), domiciliosController.listar);
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), createLimiter, validate(crearSchema), domiciliosController.crear);
router.get('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.read'), domiciliosController.verDetalle);
router.put('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.actualizar);
router.patch('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.actualizar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.cambiarEstado);
router.patch('/:id/convertir', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.cambiarEstado);
router.patch('/:id/tarifa', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.actualizarTarifa);
router.patch('/:id/repartidor', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.asignarRepartidor);
router.get('/usuario/:usuarioId', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.read'), domiciliosController.porCliente);

// Rutas de tarifas accesibles también desde /api/domicilios/tarifas
router.get('/tarifas', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.read'), domiciliosController.listarTarifas);
router.post('/tarifas', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.crearTarifa);
router.put('/tarifas/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.write'), domiciliosController.actualizarTarifaTemplate);
router.delete('/tarifas/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'domicilios.delete'), domiciliosController.eliminarTarifaTemplate);

// Rutas para usuarios autenticados (repartidor y cliente)
router.get('/mis-domicilios', verifyToken, domiciliosController.misDomicilios);
router.get('/mis-pedidos-domicilio', verifyToken, domiciliosController.misPedidosDomicilio);

// Ruta para que repartidores actualicen el estado de sus propios domicilio
router.patch('/:id/estado-repartidor', verifyToken, checkPermission('domicilios.write'), domiciliosController.cambiarEstadoRepartidor);

module.exports = router;
