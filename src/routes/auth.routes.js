const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rutas protegidas
router.get('/me', verifyToken, authController.me);
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;