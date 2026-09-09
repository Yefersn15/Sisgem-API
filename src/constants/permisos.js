// Fuente única de verdad para los permisos y los roles "base" del sistema.
// Antes esta lista vivía duplicada en roles.service.js y en scripts/seedAdmin.js
// (podían desincronizarse); ahora ambos importan de aquí.
//
// El chequeo de permisos (ver middlewares/auth.js) es un Array.includes de
// string EXACTO — no hay wildcards tipo 'productos.*'. Por eso cada rol debe
// listar cada permiso puntual que necesita, no un prefijo de módulo.
const PERMISOS_DISPONIBLES = [
  'ventas.read', 'ventas.write', 'ventas.delete',
  'pedidos.read', 'pedidos.write', 'pedidos.delete',
  'pagos.read', 'pagos.write', 'pagos.delete',
  'domicilios.read', 'domicilios.write', 'domicilios.delete',
  'productos.read', 'productos.write', 'productos.delete',
  'categorias.read', 'categorias.write', 'categorias.delete',
  'marcas.read', 'marcas.write', 'marcas.delete',
  'banners.read', 'banners.write', 'banners.delete',
  'caja.read', 'caja.write',
  'usuarios.read', 'usuarios.write', 'usuarios.delete',
  'roles.read', 'roles.write', 'roles.delete',
  'config.read', 'config.write',
  'reportes.read'
];

// El rol ADMIN (superusuario, cuenta esAdminPrincipal creada por
// npm run seed:db) no está aquí: siempre recibe TODOS los permisos y además
// el bypass hardcodeado por nombre en middlewares/auth.js, así que su seed
// vive aparte en scripts/seedAdmin.js.
//
// Estos 4 son los roles "base" que se pueden asignar a otros usuarios desde
// el panel. Nombres elegidos para no chocar con los strings 'ADMIN' /
// 'ADMINISTRADOR' que el código trata como superusuario en varios puntos
// (middlewares/auth.js, usuarios.service.js, roles.service.js) — si un rol
// normal se llamara igual heredaría ese bypass total sin querer.
const ROLES_BASE = [
  {
    nombre: 'GERENTE',
    descripcion: 'Administra catálogo (productos/marcas/categorías/banners), usuarios y roles, aprueba o rechaza pedidos por abono y asigna repartidores. No gestiona la configuración del sistema ni abre/cierra caja directamente.',
    permisos: [
      'productos.read', 'productos.write', 'productos.delete',
      'marcas.read', 'marcas.write', 'marcas.delete',
      'categorias.read', 'categorias.write', 'categorias.delete',
      'banners.write', 'banners.delete',
      'usuarios.read', 'usuarios.write', 'usuarios.delete',
      'roles.read', 'roles.write', 'roles.delete',
      'pedidos.read', 'pedidos.write', 'pedidos.delete',
      'ventas.read',
      'domicilios.read', 'domicilios.write',
      'caja.read',
      'reportes.read'
    ],
    esDefault: false,
    estado: true
  },
  {
    nombre: 'CAJERO',
    descripcion: 'Repone inventario, habilita/deshabilita productos, marcas y categorías, asigna repartidores a los domicilios y opera la caja (abrir/cerrar).',
    permisos: [
      'productos.read', 'productos.write',
      'marcas.read', 'marcas.write',
      'categorias.read', 'categorias.write',
      'domicilios.read', 'domicilios.write',
      'caja.read', 'caja.write'
    ],
    esDefault: false,
    estado: true
  },
  {
    nombre: 'DOMICILIARIO',
    descripcion: 'Realiza los domicilios que le asignen y actualiza el estado de sus propias entregas.',
    // Necesita 'domicilios.write' porque la ruta que usa para actualizar el
    // estado de SU propio domicilio (PATCH /domicilios/:id/estado-repartidor)
    // exige ese mismo permiso general (el backend no distingue "escribir
    // cualquier domicilio" de "escribir el mío"; la restricción de dueño
    // vive en domicilios.service.js::cambiarEstadoRepartidor). Efecto
    // colateral conocido: con este permiso también podría, en teoría, usar
    // otras rutas de domicilios.write (crear, editar tarifas, asignar
    // repartidor a domicilios ajenos) — aceptable porque las cuentas
    // DOMICILIARIO las crea un GERENTE/ADMIN de confianza, no se autoregistran.
    permisos: ['domicilios.write'],
    esDefault: false,
    estado: true
  },
  {
    nombre: 'CLIENTE',
    descripcion: 'Cliente que compra en la tienda, ve sus propios pedidos y puede solicitar pedidos por abono.',
    permisos: ['perfil.read', 'perfil.write', 'pedidos.read'],
    esDefault: true,
    estado: true
  }
];

module.exports = { PERMISOS_DISPONIBLES, ROLES_BASE };
