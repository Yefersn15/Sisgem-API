const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Rutas protegidas - Solo ADMIN
router.get('/ventas/dia', verifyToken, checkRole(['ADMIN']), dashboardController.ventasDia);
router.get('/ventas/semana', verifyToken, checkRole(['ADMIN']), dashboardController.ventasSemana);
router.get('/ventas/mes', verifyToken, checkRole(['ADMIN']), dashboardController.ventasMes);
router.get('/productos/mas-vendidos', verifyToken, checkRole(['ADMIN']), dashboardController.productosMasVendidos);
router.get('/stock-bajo', verifyToken, checkRole(['ADMIN']), dashboardController.stockBajo);
router.get('/pedidos/pendientes', verifyToken, checkRole(['ADMIN']), dashboardController.pedidosPendientes);
router.get('/ventas/por-cliente', verifyToken, checkRole(['ADMIN']), dashboardController.ventasPorCliente);
router.get('/domicilios/eficiencia', verifyToken, checkRole(['ADMIN']), dashboardController.domiciliosEficiencia);

module.exports = router;
