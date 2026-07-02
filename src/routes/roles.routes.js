const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

// Ruta pública para obtener rol por nombre (sin autenticación)
router.get('/nombre/:nombre', rolesController.verPorNombre);

// Ruta pública para listar permisos disponibles
router.get('/permisos', rolesController.listarPermisos);

// Ruta pública para crear roles por defecto (solo si no existen) - sin auth
router.post('/seed', rolesController.seedRoles);

// Rutas protegidas - Solo admin
router.get('/', verifyToken, checkRole(['ADMIN']), rolesController.listar);
router.post('/', verifyToken, checkRole(['ADMIN']), rolesController.crear);

// Ruta protegida - usuario autenticado puede ver detalle de cualquier rol
router.get('/:id', verifyToken, rolesController.verDetalle);

// Rutas protegidas - Solo admin
router.put('/:id', verifyToken, checkRole(['ADMIN']), rolesController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), rolesController.eliminar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), rolesController.cambiarEstado);

module.exports = router;