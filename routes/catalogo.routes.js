const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogo.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Rutas públicas (catálogo de la tienda - productos sin proveedor)
router.get('/productos', catalogoController.listarProductos);  // Catálogo público
router.get('/productos/:id', catalogoController.verProducto);
router.get('/categorias', catalogoController.listarCategorias);
router.get('/marcas', catalogoController.listarMarcas);

// Rutas del catálogo del proveedor (protegidas - ADMIN y PROVEEDOR)
router.get('/proveedor', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.listarMisProductos);
router.post('/proveedor', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.crearProducto);
router.put('/proveedor/:id', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.actualizarProducto);
router.delete('/proveedor/:id', verifyToken, checkRole(['ADMIN', 'PROVEEDOR']), catalogoController.eliminarProducto);

module.exports = router;
