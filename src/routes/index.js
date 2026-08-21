// Agrega y monta todas las rutas de la API en un solo lugar, para que
// app.js no tenga que crecer con un require + app.use por cada módulo nuevo.
const express = require('express');

const router = express.Router();

router.use('/auth', require('../api/auth/auth.routes'));
router.use('/roles', require('../api/roles/roles.routes'));
router.use('/usuarios', require('../api/usuarios/usuarios.routes'));
router.use('/categorias', require('../api/categorias/categorias.routes'));
router.use('/marcas', require('../api/marcas/marcas.routes'));
router.use('/productos', require('../api/productos/productos.routes'));
router.use('/pedidos', require('../api/pedidos/pedidos.routes'));
router.use('/pagos', require('../api/pagos/pagos.routes'));
router.use('/domicilios', require('../api/domicilios/domicilios.routes'));
router.use('/dashboard', require('../api/dashboard/dashboard.routes'));
router.use('/banners', require('../api/banners/banners.routes'));
router.use('/carrito', require('../api/carrito/carrito.routes'));
router.use('/upload', require('../api/upload/upload.routes'));

module.exports = router;
