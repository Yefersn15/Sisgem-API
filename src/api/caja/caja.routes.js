const express = require('express');
const router = express.Router();
const cajaController = require('./caja.controller');
const { validate, abrirSchema, cerrarSchema } = require('./caja.validator');
const { verifyToken, checkRoleOrPermission } = require('../../middlewares/auth');

// Rutas literales antes de '/:id' (ver el bug ya corregido en
// domicilios.routes.js: si '/:id' se registra primero, Express interpreta
// cualquier ruta literal de un solo segmento como el parámetro id).
router.get('/actual', verifyToken, checkRoleOrPermission(['ADMIN'], 'caja.read'), cajaController.actual);
router.post('/abrir', verifyToken, checkRoleOrPermission(['ADMIN'], 'caja.write'), validate(abrirSchema), cajaController.abrir);
router.get('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'caja.read'), cajaController.listar);
router.get('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'caja.read'), cajaController.verDetalle);
router.patch('/:id/cerrar', verifyToken, checkRoleOrPermission(['ADMIN'], 'caja.write'), validate(cerrarSchema), cajaController.cerrar);

module.exports = router;
