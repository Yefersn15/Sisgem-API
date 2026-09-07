const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { apiLimiter } = require('./middlewares/rateLimit');
const { errorResponse } = require('./utils/helpers');
const { version } = require('../package.json');

const authRoutes = require('./api/auth/auth.routes');
const rolesRoutes = require('./api/roles/roles.routes');
const usuariosRoutes = require('./api/usuarios/usuarios.routes');
const categoriasRoutes = require('./api/categorias/categorias.routes');
const marcasRoutes = require('./api/marcas/marcas.routes');
const productosRoutes = require('./api/productos/productos.routes');
const pedidosRoutes = require('./api/pedidos/pedidos.routes');
const pagosRoutes = require('./api/pagos/pagos.routes');
const domiciliosRoutes = require('./api/domicilios/domicilios.routes');
const dashboardRoutes = require('./api/dashboard/dashboard.routes');
const bannersRoutes = require('./api/banners/banners.routes');
const carritoRoutes = require('./api/carrito/carrito.routes');
const uploadRoutes = require('./api/upload/upload.routes');
const configuracionRoutes = require('./api/configuracion/configuracion.routes');

// Configuración de multer para uploads de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();

// Render (como Heroku/Railway) pone la API detrás de un proxy inverso: sin
// esto, Express no confía en la cabecera X-Forwarded-For y `req.ip` devuelve
// la IP interna del proxy para TODAS las peticiones, sin importar quién las
// haga de verdad. express-rate-limit usa `req.ip` como clave por defecto, así
// que sin este ajuste todos los visitantes comparten un único cupo de
// solicitudes — cualquiera se queda bloqueado (429) casi de inmediato,
// incluso en su primera visita, porque el cupo ya lo agotó tráfico de otra
// persona. `1` le dice a Express que confíe solo en el primer proxy de la
// cadena (el de Render), que es exactamente la topología real.
app.set('trust proxy', 1);

// Lista blanca de orígenes permitidos (front web). No aplica a apps nativas
// (la app móvil no manda cabecera Origin, así que CORS no la afecta).
// Configurable por env: CORS_ORIGINS admite varios orígenes separados por coma.
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = [...new Set([...configuredOrigins, ...defaultDevOrigins])];

const corsOptions = {
  origin(origin, callback) {
    // Sin cabecera Origin (curl, apps nativas, health checks) → permitir.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Middleware para hacer disponible upload en las rutas
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/marcas', marcasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/domicilios', domiciliosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/configuracion', configuracionRoutes);

// Endpoint informativo de la API: mínima divulgación de información a
// propósito — no lista los recursos internos montados más abajo.
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API de SISGEM — Sistema de Gestión Mercantil',
    version,
    status: 'OK'
  });
});

// Manejo de errores 404 — cualquier ruta no reconocida, sin importar el
// verbo HTTP, responde el mismo formato estandarizado que el resto de la API.
app.use((req, res) => {
  errorResponse(res, 'El recurso solicitado no fue encontrado.', 404);
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  if (err.message === 'Origen no permitido por CORS') {
    return errorResponse(res, err.message, 403);
  }
  console.error('❌ Error global:', err.stack);
  // El detalle del error solo se expone fuera de producción, para no filtrar
  // información interna (rutas de archivos, consultas SQL, etc.) a un cliente.
  const detalle = process.env.NODE_ENV !== 'production' ? { error: err.message } : {};
  res.status(500).json({ success: false, message: 'Error interno del servidor', status: 500, ...detalle });
});

module.exports = app;