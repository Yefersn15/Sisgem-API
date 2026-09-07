const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB máximo por imagen
});
const uploadController = require('./upload.controller');
const { verifyToken, checkRole } = require('../../middlewares/auth');

// Subir/listar imágenes es infraestructura compartida: la usa cualquier
// usuario autenticado que edite un campo de imagen propio (p. ej. su foto
// de perfil en Mi Perfil), no solo el admin gestionando productos/banners.
// Eliminar sí se deja solo para ADMIN — borra un asset compartido que puede
// seguir en uso en otro registro.
router.get('/', verifyToken, uploadController.listarImagenes);
router.post('/', verifyToken, upload.single('imagen'), uploadController.subirImagen);
router.delete('/', verifyToken, checkRole(['ADMIN']), uploadController.eliminarImagen);

module.exports = router;
