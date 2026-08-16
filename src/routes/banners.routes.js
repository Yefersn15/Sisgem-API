const express = require('express');
const router = express.Router();
const bannersController = require('../controllers/banners.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Ruta pública (sin autenticación) - solo banners activos
router.get('/', bannersController.listar);

// Rutas protegidas - Solo ADMIN
router.post('/', verifyToken, checkRole(['ADMIN']), bannersController.crear);
router.put('/:id', verifyToken, checkRole(['ADMIN']), bannersController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), bannersController.eliminar);

module.exports = router;
