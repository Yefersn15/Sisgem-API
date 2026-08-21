const express = require('express');
const router = express.Router();
const carritoController = require('./carrito.controller');
const { validate, agregarItemSchema, actualizarItemSchema } = require('./carrito.validator');
const { verifyToken } = require('../../middlewares/auth');

router.use(verifyToken); // Todas las rutas requieren autenticación

router.get('/', carritoController.obtenerCarrito);
router.post('/items', validate(agregarItemSchema), carritoController.agregarItem);
router.put('/items/:productoId', validate(actualizarItemSchema), carritoController.actualizarItem);
router.delete('/items/:productoId', carritoController.eliminarItem);
router.delete('/', carritoController.vaciarCarrito);

module.exports = router;
