const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { validate, registerSchema } = require('./auth.validator');
const { verifyToken } = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimit');

// Rutas públicas
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Rutas protegidas
router.get('/me', verifyToken, authController.me);
router.post('/change-password', verifyToken, authLimiter, authController.changePassword);

module.exports = router;
