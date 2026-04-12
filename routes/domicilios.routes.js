const express = require('express');
const router = express.Router();
const domiciliosController = require('../controllers/domicilios.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Rutas protegidas - Solo ADMIN
router.get('/', verifyToken, checkRole(['ADMIN']), domiciliosController.listar);
router.post('/', verifyToken, checkRole(['ADMIN']),domiciliosController.crear);
router.get('/:id', verifyToken, checkRole(['ADMIN']),domiciliosController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']),domiciliosController.actualizar);
router.patch('/:id', verifyToken, checkRole(['ADMIN']),domiciliosController.actualizar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']),domiciliosController.cambiarEstado);
router.patch('/:id/convertir', verifyToken, checkRole(['ADMIN']),domiciliosController.cambiarEstado);
router.patch('/:id/tarifa', verifyToken, checkRole(['ADMIN']),domiciliosController.actualizarTarifa);
router.patch('/:id/repartidor', verifyToken, checkRole(['ADMIN']),domiciliosController.asignarRepartidor);
router.get('/usuario/:usuarioId', verifyToken, checkRole(['ADMIN']),domiciliosController.porCliente);

// Rutas de tarifas accesibles también desde /api/domicilios/tarifas
router.get('/tarifas', verifyToken, checkRole(['ADMIN']),domiciliosController.listarTarifas);
router.post('/tarifas', verifyToken, checkRole(['ADMIN']),domiciliosController.crearTarifa);
router.put('/tarifas/:id', verifyToken, checkRole(['ADMIN']),domiciliosController.actualizarTarifaTemplate);
router.delete('/tarifas/:id', verifyToken, checkRole(['ADMIN']),domiciliosController.eliminarTarifaTemplate);

// Rutas para usuarios autenticados (repartidor y cliente)
router.get('/mis-domicilios', verifyToken,domiciliosController.misDomicilios);
router.get('/mis-pedidos-domicilio', verifyToken,domiciliosController.misPedidosDomicilio);

module.exports = router;