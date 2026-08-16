-- Script de inicialización para PostgreSQL de SISGEM
-- Ejecutar este archivo una vez conectado a la base de datos objetivo.

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  permisos JSONB DEFAULT '[]'::jsonb,
  es_default BOOLEAN DEFAULT FALSE,
  estado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nit VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(100),
  direccion VARCHAR(255),
  ciudad VARCHAR(100),
  logo TEXT,
  logo_data BYTEA,
  estado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  estado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marcas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  logo TEXT,
  logo_data BYTEA,
  sitio_web VARCHAR(255),
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  estado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  documento VARCHAR(20) PRIMARY KEY,
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'CC',
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  genero VARCHAR(20),
  direccion TEXT,
  barrio VARCHAR(100),
  estado BOOLEAN DEFAULT TRUE,
  foto_url TEXT,
  foto_data BYTEA,
  direcciones JSONB DEFAULT '[]'::jsonb,
  rol_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  imagen TEXT,
  imagen_data BYTEA,
  codigo_barras VARCHAR(50),
  precio_compra NUMERIC(12,2),
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  marca_id INTEGER REFERENCES marcas(id) ON DELETE SET NULL,
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
  estado BOOLEAN DEFAULT TRUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  usuario_id VARCHAR(20) NOT NULL REFERENCES usuarios(documento) ON DELETE RESTRICT,
  telefono_contacto VARCHAR(20),
  metodo_pago VARCHAR(50),
  subtotal NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  total_pagado NUMERIC(12,2) DEFAULT 0,
  estado_pedido VARCHAR(50) DEFAULT 'Pendiente',
  estado_venta VARCHAR(50) DEFAULT 'Pendiente',
  es_venta BOOLEAN DEFAULT TRUE,
  tipo_venta VARCHAR(20) DEFAULT 'mostrador',
  observaciones TEXT,
  direccion JSONB,
  productos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  metodo VARCHAR(50),
  referencia VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'Pendiente',
  fecha_pago TIMESTAMP WITH TIME ZONE,
  tipo VARCHAR(20) DEFAULT 'pago_total',
  comprobante TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS domicilios (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedidos(id) ON DELETE CASCADE,
  repartidor_id VARCHAR(20),
  direccion VARCHAR(255),
  direccion2 VARCHAR(255),
  barrio VARCHAR(100),
  ciudad VARCHAR(100),
  telefono VARCHAR(20),
  estado VARCHAR(50) DEFAULT 'Pendiente',
  costo NUMERIC(10,2) DEFAULT 0,
  tarifa_aplicada NUMERIC(10,2) DEFAULT 0,
  repartidor JSONB DEFAULT '{}'::jsonb,
  fecha_asignacion TIMESTAMP WITH TIME ZONE,
  datos_front JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id SERIAL PRIMARY KEY,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
  usuario_id VARCHAR(20) NOT NULL REFERENCES usuarios(documento) ON DELETE RESTRICT,
  estado VARCHAR(50) DEFAULT 'Pendiente',
  subtotal NUMERIC(12,2) DEFAULT 0,
  impuesto NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notas TEXT,
  productos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  layout VARCHAR(30) NOT NULL DEFAULT 'single',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  titulo VARCHAR(200),
  texto TEXT,
  text_position VARCHAR(10) NOT NULL DEFAULT 'none',
  display_order INTEGER DEFAULT 0,
  estado BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalogo (
  id SERIAL PRIMARY KEY,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio_sugerido NUMERIC(12,2) DEFAULT 0,
  imagen TEXT,
  categoria_nombre VARCHAR(100),
  marca_nombre VARCHAR(100),
  estado_stock VARCHAR(50) DEFAULT 'Disponible',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nombre, descripcion, permisos, es_default, estado)
VALUES (
  'ADMIN',
  'Administrador del sistema con acceso total',
  '[
    "ventas.read","ventas.write","ventas.delete",
    "pedidos.read","pedidos.write","pedidos.delete",
    "pagos.read","pagos.write","pagos.delete",
    "domicilios.read","domicilios.write","domicilios.delete",
    "productos.read","productos.write","productos.delete",
    "categorias.read","categorias.write","categorias.delete",
    "marcas.read","marcas.write","marcas.delete",
    "proveedores.read","proveedores.write","proveedores.delete",
    "usuarios.read","usuarios.write","usuarios.delete",
    "roles.read","roles.write","roles.delete",
    "config.read","config.write",
    "reportes.read"
  ]'::jsonb,
  FALSE,
  TRUE
) ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (
  documento,
  tipo_documento,
  nombre,
  apellido,
  email,
  password,
  telefono,
  genero,
  direccion,
  barrio,
  estado,
  rol_id
)
SELECT
  '1000000000',
  'CC',
  'Admin',
  'Sistema',
  'admin@sisgem.com',
  '$2b$10$ECG7ojgeLewFUzfYSxTtvOtLsOzz68VLGV9WYXvDLHzNjAOjSed4u',
  '3000000000',
  'Otro',
  'Sede principal',
  'Principal',
  TRUE,
  r.id
FROM roles r
WHERE r.nombre = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM usuarios u WHERE u.email = 'admin@sisgem.com'
  );

UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE nombre = 'ADMIN')
WHERE email = 'admin@sisgem.com'
  AND rol_id IS DISTINCT FROM (SELECT id FROM roles WHERE nombre = 'ADMIN');

CREATE INDEX IF NOT EXISTS idx_marcas_proveedor_id ON marcas(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_marca_id ON productos(marca_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor_id ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id ON usuarios(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_proveedor_id ON usuarios(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido_id ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor_id ON ordenes_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_usuario_id ON ordenes_compra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_proveedor_id ON catalogo(proveedor_id);