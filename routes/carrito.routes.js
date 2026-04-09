const express = require('express');
const router = express.Router();
const carritoController = require('../controllers/carrito.controller');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken); // Todas las rutas requieren autenticación

router.get('/', carritoController.obtenerCarrito);
router.post('/items', carritoController.agregarItem);
router.put('/items/:productoId', carritoController.actualizarItem);
router.delete('/items/:productoId', carritoController.eliminarItem);
router.delete('/', carritoController.vaciarCarrito);

module.exports = router;