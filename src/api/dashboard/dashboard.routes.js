const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { verifyToken, checkRoleOrPermission } = require('../../middlewares/auth');

// ADMIN o el permiso granular reportes.read del rol propio (ver
// checkRoleOrPermission) — antes checkRole(['ADMIN']) fijo, así que ningún
// rol personalizado con reportes.read marcado podía ver el dashboard.
router.get('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.index);
router.get('/ventas/dia', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.ventasDia);
router.get('/ventas/semana', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.ventasSemana);
router.get('/ventas/mes', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.ventasMes);
router.get('/productos/mas-vendidos', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.productosMasVendidos);
router.get('/stock-bajo', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.stockBajo);
router.get('/pedidos/pendientes', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.pedidosPendientes);
router.get('/ventas/por-cliente', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.ventasPorCliente);
router.get('/domicilios/eficiencia', verifyToken, checkRoleOrPermission(['ADMIN'], 'reportes.read'), dashboardController.domiciliosEficiencia);

module.exports = router;
