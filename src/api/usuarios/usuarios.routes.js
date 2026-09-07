const express = require('express');
const router = express.Router();
const usuariosController = require('./usuarios.controller');
const { validate, crearSchema } = require('./usuarios.validator');
const { verifyToken, checkRoleOrPermission, allowSelfOrAdmin } = require('../../middlewares/auth');

// Rutas de direcciones del usuario (DEBEN estar ANTES de /:id)
router.get('/direcciones', verifyToken, usuariosController.listarDirecciones);
router.post('/direcciones', verifyToken, usuariosController.agregarDireccion);
router.put('/direcciones/:id', verifyToken, usuariosController.actualizarDireccion);
router.delete('/direcciones/:id', verifyToken, usuariosController.eliminarDireccion);
router.patch('/direcciones/:id/predeterminada', verifyToken, usuariosController.direccionPredeterminada);

// Rutas protegidas
// GET /:id permite ver el propio usuario (cualquier rol autenticado)
// Las demás requieren ADMIN o el permiso granular usuarios.* del rol propio
// (ver checkRoleOrPermission en middlewares/auth.js) — antes estaban fijas a
// checkRole(['ADMIN']), así que ningún rol personalizado con usuarios.write
// marcado podía usarlas, sin importar los permisos que se le asignaran.
router.get('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'usuarios.read'), usuariosController.listar);
router.post('/', verifyToken, checkRoleOrPermission(['ADMIN'], 'usuarios.write'), validate(crearSchema), usuariosController.crear);
router.get('/documento/:documento', verifyToken, checkRoleOrPermission(['ADMIN'], 'usuarios.read'), usuariosController.verDetallePorDocumento);
router.get('/:id', verifyToken, allowSelfOrAdmin, usuariosController.verDetalle);
// PUT permite admin O el propio usuario
router.put('/:id', verifyToken, allowSelfOrAdmin, usuariosController.actualizar);
router.delete('/:id', verifyToken, checkRoleOrPermission(['ADMIN'], 'usuarios.delete'), usuariosController.eliminar);
router.patch('/:id/estado', verifyToken, checkRoleOrPermission(['ADMIN'], 'usuarios.write'), usuariosController.cambiarEstado);

module.exports = router;
