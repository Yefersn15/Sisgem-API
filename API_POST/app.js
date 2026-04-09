const express = require('express');
const cors = require('cors');
const multer = require('multer');

// Configuración de multer para uploads de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const rolesRoutes = require('./routes/roles.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const marcasRoutes = require('./routes/marcas.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const productosRoutes = require('./routes/productos.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const pagosRoutes = require('./routes/pagos.routes');
const domicilioRoutes = require('./routes/domicilios.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const bannersRoutes = require('./routes/banners.routes');
const ordenesCompraRoutes = require('./routes/ordenesCompra.routes');

const app = express();

// Configuración CORS
const corsOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/domicilios', domicilioRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/ordenes-compra', ordenesCompraRoutes);

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
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app;