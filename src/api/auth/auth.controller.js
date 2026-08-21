const service = require('./auth.service');
const { successResponse, errorResponse } = require('../../utils/helpers');

const handleError = (res, error) => {
  console.error(error);
  const statusCode = error.isAppError ? error.statusCode : 500;
  return errorResponse(res, error.message, statusCode);
};

exports.register = async (req, res) => {
  try {
    await service.register(req.body);
    return successResponse(res, null, 'Usuario registrado exitosamente', 201);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const result = await service.login(req.body);
    return successResponse(res, result, 'Login exitoso');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.me = async (req, res) => {
  try {
    const usuario = await service.getMe(req.user.documento);
    return successResponse(res, usuario);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    await service.changePassword(req.user.documento, req.body);
    return successResponse(res, null, 'Contraseña actualizada correctamente');
  } catch (error) {
    return handleError(res, error);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const message = await service.forgotPassword(req.body.email);
    return successResponse(res, null, message);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await service.resetPassword(req.body);
    return successResponse(res, null, 'Contraseña restablecida correctamente');
  } catch (error) {
    return handleError(res, error);
  }
};
