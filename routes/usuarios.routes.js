const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verifyToken, checkRole, allowSelfOrAdmin } = require('../middlewares/auth');

// Rutas protegidas
// GET /:id permite ver el propio usuario (cualquier rol autenticado)
// Las demás rutas solo admin
router.get('/', verifyToken, checkRole(['ADMIN']), usuariosController.listar);
router.post('/', verifyToken, checkRole(['ADMIN']), usuariosController.crear);
router.get('/documento/:documento', verifyToken, checkRole(['ADMIN']), usuariosController.verDetallePorDocumento);
router.get('/:id', verifyToken, usuariosController.verDetalle);
// PUT permite admin O el propio usuario
router.put('/:id', verifyToken, allowSelfOrAdmin, usuariosController.actualizar);
router.delete('/:id', verifyToken, checkRole(['ADMIN']), usuariosController.eliminar);
router.patch('/:id/estado', verifyToken, checkRole(['ADMIN']), usuariosController.cambiarEstado);

// Rutas de direcciones del usuario (cualquier usuario autenticado)
router.get('/direcciones', verifyToken, usuariosController.listarDirecciones);
router.post('/direcciones', verifyToken, usuariosController.agregarDireccion);
router.put('/direcciones/:id', verifyToken, usuariosController.actualizarDireccion);
router.delete('/direcciones/:id', verifyToken, usuariosController.eliminarDireccion);
router.patch('/direcciones/:id/predeterminada', verifyToken, usuariosController.direccionPredeterminada);

module.exports = router;