// Error con código HTTP explícito, para que un service pueda señalar
// "esto es un 404" o "esto es un 400" sin conocer Express ni res.
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isAppError = true;
  }
}

module.exports = AppError;
