// Carga las variables de entorno de pruebas ANTES de que cualquier archivo
// de test requiera src/app o src/models (que leen process.env al cargarse).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });
