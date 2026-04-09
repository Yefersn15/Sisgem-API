-- Crear base de datos si no existe
SELECT 'CREATE DATABASE "Sisgem-API"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'Sisgem-API')\gexec

-- Base de datos La Tiendita - PostgreSQL
-- Script de creación de tablas con IDs Integer autoIncrementales

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '[]',
    es_default BOOLEAN DEFAULT false,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    documento VARCHAR(20) PRIMARY KEY,
    tipo_documento VARCHAR(10) NOT NULL DEFAULT 'CC',
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    genero VARCHAR(20),
    direccion TEXT,
    barrio VARCHAR(100),
    rol_id INTEGER REFERENCES roles(id),
    proveedor_id INTEGER,
    estado BOOLEAN DEFAULT true,
    foto_url TEXT,
    foto_data BYTEA,
    direcciones JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    foto_url TEXT,
    foto_data BYTEA,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Marcas
CREATE TABLE IF NOT EXISTS marcas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    logo TEXT,
    logo_data BYTEA,
    sitio_web VARCHAR(255),
    proveedor_id INTEGER,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id SERIAL PRIMARY KEY,
    nit VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    ciudad VARCHAR(100),
    logo TEXT,
    logo_data BYTEA,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(12, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    imagen TEXT,
    imagen_data BYTEA,
    codigo_barras VARCHAR(50),
    precio_compra DECIMAL(12, 2),
    categoria_id INTEGER REFERENCES categorias(id),
    marca_id INTEGER REFERENCES marcas(id),
    proveedor_id INTEGER REFERENCES proveedores(id),
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(20) REFERENCES usuarios(documento),
    tipo_venta VARCHAR(20) DEFAULT 'mostrador',
    productos JSONB DEFAULT '[]',
    subtotal DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    total_pagado DECIMAL(12, 2) DEFAULT 0,
    estado_pedido VARCHAR(50) DEFAULT 'Pendiente',
    estado_venta VARCHAR(50) DEFAULT 'Pendiente',
    es_venta BOOLEAN DEFAULT true,
    observaciones TEXT,
    metodo_pago VARCHAR(50),
    telefono_contacto VARCHAR(20),
    direccion JSONB,
    fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Domicilios
CREATE TABLE IF NOT EXISTS domicilios (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id),
    repartidor_id VARCHAR(20) REFERENCES usuarios(documento),
    direccion VARCHAR(255),
    direccion2 VARCHAR(255),
    barrio VARCHAR(100),
    ciudad VARCHAR(100),
    telefono VARCHAR(20),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    costo DECIMAL(10, 2) DEFAULT 0,
    tarifa_aplicada DECIMAL(10, 2) DEFAULT 0,
    repartidor JSONB,
    fecha_asignacion TIMESTAMP,
    datos_front JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id),
    monto DECIMAL(12, 2) NOT NULL,
    metodo VARCHAR(50),
    referencia VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    fecha_pago TIMESTAMP,
    tipo VARCHAR(20) DEFAULT 'pago_total',
    comprobante TEXT,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Banners
CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100),
    imagen TEXT NOT NULL,
    imagen_data BYTEA,
    enlace TEXT,
    estado BOOLEAN DEFAULT true,
    posicion INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Órdenes de Compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id SERIAL PRIMARY KEY,
    proveedor_id INTEGER REFERENCES proveedores(id),
    usuario_id VARCHAR(20) REFERENCES usuarios(documento),
    fecha_orden DATE DEFAULT CURRENT_DATE,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Detalles de Orden de Compra
CREATE TABLE IF NOT EXISTS orden_detalle (
    id SERIAL PRIMARY KEY,
    orden_id INTEGER REFERENCES ordenes_compra(id),
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar Roles por defecto
INSERT INTO roles (nombre, descripcion, permisos, es_default) 
SELECT 'ADMIN', 'Administrador del sistema', '["ALL"]', true WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'ADMIN');
INSERT INTO roles (nombre, descripcion, permisos) 
SELECT 'PROVEEDOR', 'Proveedor de productos', '["ver_productos", "crear_productos", "editar_productos"]' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'PROVEEDOR');
INSERT INTO roles (nombre, descripcion, permisos) 
SELECT 'USUARIO', 'Cliente regular', '["ver_productos", "hacer_pedidos"]' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'USUARIO');

-- Índices para mejorar rendimiento
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_marca ON productos(marca_id);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado_pedido);
CREATE INDEX idx_domicilios_pedido ON domicilios(pedido_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);