const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogo.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// ================== CATÁLOGO PÚBLICO (Tienda) ==================
// Rutas públicas (catálogo de la tienda - productos sin proveedor)
router.get('/productos', catalogoController.listarProductos);  // Catálogo público
router.get('/productos/:id', catalogoController.verProducto);
router.get('/categorias', catalogoController.listarCategorias);
router.get('/marcas', catalogoController.listarMarcas);

// ================== CATÁLOGO DEL PROVEEDOR (Viejo - en tabla productos) ==================
router.get('/proveedor', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.listarMisProductos);
router.post('/proveedor', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.crearProducto);
router.put('/proveedor/:id', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.actualizarProducto);
router.delete('/proveedor/:id', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.eliminarProducto);

// ================== NUEVO CATÁLOGO (Tabla separada) ==================
router.get('/', verifyToken, catalogoController.listar);
router.get('/:id', verifyToken, catalogoController.ver);
router.post('/', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.crear);
router.put('/:id', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), catalogoController.eliminar);

module.exports = router;
