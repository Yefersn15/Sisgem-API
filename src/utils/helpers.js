// Helpers utilities

// Generar respuesta exitosa. `status` va también en el body (además del
// código HTTP real) para que cualquier respuesta de la API sea consistente
// consigo misma sin tener que inspeccionar la cabecera.
const successResponse = (res, data, message = 'Operación exitosa', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    status: statusCode
  });
};

// Generar respuesta de error
const errorResponse = (res, message = 'Error interno del servidor', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    status: statusCode
  });
};

module.exports = {
  successResponse,
  errorResponse
};
