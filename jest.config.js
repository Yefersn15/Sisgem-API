module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  testTimeout: 20000,
  // Una base de datos de prueba compartida entre archivos: correr en serie
  // evita que dos sync({ force: true }) choquen entre sí.
  maxWorkers: 1,
  forceExit: true,
  verbose: true,
};
