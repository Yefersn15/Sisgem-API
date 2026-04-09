// Helpers utilities

// Generar respuesta exitosa
const successResponse = (res, data, message = 'Operación exitosa', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Generar respuesta de error
const errorResponse = (res, message = 'Error interno del servidor', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};

// Validar ObjectId
const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  successResponse,
  errorResponse,
  isValidObjectId
};
