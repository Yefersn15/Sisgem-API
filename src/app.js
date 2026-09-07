const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { apiLimiter } = require('./middlewares/rateLimit');

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

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'API Sisgem PostgreSQL funcionando correctamente' });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error('❌ Error global:', err.stack);
  const body = { message: 'Error interno del servidor' };
  // El detalle del error solo se expone fuera de producción, para no filtrar
  // información interna (rutas de archivos, consultas SQL, etc.) a un cliente.
  if (process.env.NODE_ENV !== 'production') {
    body.error = err.message;
  }
  res.status(500).json(body);
});

module.exports = app;