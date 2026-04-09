const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedores.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Rutas públicas (sin autenticación) - para ver lista de proveedores
router.get('/', proveedoresController.listar);

// Rutas protegidas - Solo ADMIN
router.post('/', verifyToken, checkRole(['ADMIN']), proveedoresController.crear);
router.get('/:id', verifyToken, checkRole(['ADMIN']), proveedoresController.verDetalle);
router.put('/:id', verifyToken, checkRole(['ADMIN']), proveedoresController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), proveedoresController.eliminar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), proveedoresController.cambiarEstado);

module.exports = router;
