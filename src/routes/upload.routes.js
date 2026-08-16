const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB máximo por imagen
});
const uploadController = require('../controllers/upload.controller');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.get('/', verifyToken, checkRole(['ADMIN']), uploadController.listarImagenes);
router.post('/', verifyToken, checkRole(['ADMIN']), upload.single('imagen'), uploadController.subirImagen);
router.delete('/', verifyToken, checkRole(['ADMIN']), uploadController.eliminarImagen);

module.exports = router;
