# SISGEM API

Backend REST de SISGEM (Sistema de Gestión Comercial): una API para una tienda con catálogo de productos, carrito de compras, pedidos/ventas, pagos y abonos, domicilios, y panel administrativo con roles y permisos.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Runtime | Node.js |
| Framework HTTP | Express 5 |
| Base de datos | PostgreSQL |
| ORM | Sequelize 6 |
| Autenticación | JWT (`jsonwebtoken`) + `bcrypt` para hash de contraseñas |
| Subida de imágenes | Cloudinary (`cloudinary`) vía `multer` (memoria) |
| Envío de correos | API HTTP de Brevo — recuperación de contraseña |
| Importación/Exportación | `xlsx` (Excel) |
| CORS | `cors` (abierto a cualquier origen) |

## Requisitos

- Node.js 18 o superior
- PostgreSQL 14 o superior
- npm
- Una cuenta de [Cloudinary](https://cloudinary.com/) (para la subida de imágenes de productos, marcas, banners, etc.)
- Opcional: una cuenta de [Brevo](https://www.brevo.com/) (API key) para que la recuperación de contraseña envíe correos reales. Sin ella, el enlace de recuperación solo se registra en la consola del servidor.

## Instalación

1. Entrar al directorio del proyecto:
   ```bash
   cd Sisgem-API
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
   Al finalizar la instalación se ejecuta automáticamente el script `postinstall` (`scripts/add-unique-index.js`), que se conecta a la base de datos, limpia domicilios duplicados por pedido y crea un índice único `pedido_id` sobre la tabla `domicilios`. Si la base de datos aún no existe o no está accesible, este paso fallará; puede ejecutarse manualmente más tarde con `node scripts/add-unique-index.js`.
3. Copiar el ejemplo de variables de entorno:
   ```bash
   copy .env.example .env
   ```
4. Ajustar los valores de `.env` según tu entorno, incluyendo las variables `ADMIN_*` (ver tabla abajo).
5. Crear la base de datos y sincronizar las tablas a partir de los modelos de Sequelize:
   ```bash
   npm run db:init
   ```
   `db/init.sql` es una alternativa manual solo para crear la base de datos (`CREATE DATABASE`); no es necesario ejecutarlo si usas `npm run db:init`.
6. Crear el usuario administrador inicial:
   ```bash
   npm run seed:db
   ```
   Es idempotente: si ya existe un usuario con el correo `ADMIN_EMAIL`, no hace nada.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto donde correrá la API (por defecto `3000` si no se define) |
| `DB_HOST` | Host de la base de datos PostgreSQL |
| `DB_PORT` | Puerto de PostgreSQL (por defecto `5432`) |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Contraseña del usuario de PostgreSQL |
| `JWT_SECRET` | Clave secreta para firmar los tokens JWT |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token JWT (ej. `1d`) |
| `CLOUDINARY_CLOUD_NAME` | Nombre de la cuenta de Cloudinary |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary |
| `FRONTEND_URL` | URL del frontend, usada para armar el enlace `/reset-password?token=...` del correo de recuperación (por defecto `http://localhost:5173`) |
| `BREVO_API_KEY` | API key de Brevo (panel de Brevo → SMTP & API → API Keys). Si se deja vacía, los correos no se envían y solo se registran en consola |
| `MAIL_FROM` | Dirección remitente que verán los destinatarios (debe estar verificada en Brevo: panel → Senders, Domains & Dedicated IPs → Senders) |
| `ADMIN_DOCUMENTO` | Documento del usuario administrador inicial. Solo usada por `npm run seed:db` |
| `ADMIN_TIPO_DOCUMENTO` | Tipo de documento del admin (por defecto `CC`). Solo usada por `npm run seed:db` |
| `ADMIN_EMAIL` | Correo del usuario administrador inicial. Solo usada por `npm run seed:db` |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial (mínimo 8 caracteres; se hashea con bcrypt). Solo usada por `npm run seed:db` |
| `ADMIN_NOMBRE` | Nombre del administrador inicial. Solo usada por `npm run seed:db` |
| `ADMIN_APELLIDO` | Apellido del administrador inicial. Solo usada por `npm run seed:db` |
| `ADMIN_TELEFONO`, `ADMIN_GENERO`, `ADMIN_DIRECCION`, `ADMIN_BARRIO` | Datos opcionales del administrador inicial. Solo usadas por `npm run seed:db` |

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm start` | Ejecuta `node src/server.js`. No hay script `dev` con recarga automática |
| `npm run db:init` | Crea la base de datos en Postgres si no existe y sincroniza las tablas a partir de los modelos de Sequelize (`sequelize.sync({ alter: true })`). Se corre una vez al preparar el entorno, no en cada arranque |
| `npm run seed:db` | Crea el rol `ADMIN` (si falta) y el usuario administrador inicial a partir de las variables `ADMIN_*` de `.env`. Idempotente |
| `npm test` | No hay pruebas configuradas |

El script `postinstall` (`scripts/add-unique-index.js`, ver arriba) sigue ejecutándose automáticamente tras `npm install`.

## Ejecución

Iniciar el servidor (después de haber corrido `db:init` y `seed:db` al menos una vez):

```bash
npm start
```

La API quedará disponible en:

```text
http://localhost:3000
```

Todas las rutas de la API están montadas bajo el prefijo `/api` (por ejemplo `/api/auth`, `/api/productos`). La ruta raíz `GET /` responde un mensaje de estado simple.

Al arrancar, `src/server.js` solo verifica la conexión a PostgreSQL y levanta el servidor; ya no sincroniza tablas ni crea el usuario admin (eso vive en `db:init`/`seed:db`, ver arriba).

## Estructura del proyecto

```
src/
├── app.js               # Configuración de Express: CORS, JSON, montaje de rutas, manejo de errores
├── server.js             # Punto de entrada: conexión a BD y arranque del servidor
├── api/<recurso>/         # Un módulo por entidad, cada uno con sus propios .routes.js -> .controller.js -> .service.js -> .repository.js (+ .validator.js)
│                          #   (domicilios además separa domicilios.liquidacion.js y domicilios.repartidor.js del service principal)
├── config/
│   ├── database.js       # Instancia de Sequelize (conexión PostgreSQL)
│   └── cloudinary.js     # Configuración del SDK de Cloudinary
├── middlewares/           auth.js, rateLimit.js
├── models/                # Modelos Sequelize y asociaciones (index.js)
└── utils/                 AppError.js, helpers.js, pagination.js, sendEmail.js
scripts/
├── add-unique-index.js  # Script de mantenimiento ejecutado en postinstall
├── dbInit.js            # npm run db:init — crea la BD y sincroniza tablas desde los modelos
└── seedAdmin.js         # npm run seed:db — crea el rol ADMIN y el usuario administrador inicial
db/
└── init.sql               # Creación manual de la BD, alternativa a `npm run db:init` (opcional)
```

No hay una carpeta compartida `src/services/` ni `src/validators/` a nivel raíz: cada módulo de `src/api/<recurso>/` trae su propio `<recurso>.service.js` y `<recurso>.validator.js` junto al resto de sus capas.

Los módulos no son totalmente independientes entre sí: `domicilios.service.js` importa `pagos.service.js` para generar el pago contraentrega al marcar un domicilio como "entregado" (y descontar el stock vendido). Es una dependencia real del negocio (entregar genera un pago), no accidental, así que se mantiene tal cual — es también la razón por la que ese es el servicio más grande del backend, incluso después de separar `domicilios.liquidacion.js` (liquidación del pago + descuento de stock) y `domicilios.repartidor.js` (asignación de repartidor) del `domicilios.service.js` principal.

## Modelo de datos (entidades principales)

Definidas en `src/models/` con Sequelize (nombres de tabla en snake_case vía `underscored: true`):

| Entidad | Descripción |
|---|---|
| `Usuario` | Clientes y administradores del sistema. Clave primaria `documento`. Password hasheado con bcrypt (hooks `beforeCreate`/`beforeUpdate`). Guarda `direcciones` (JSONB) y referencia a `Rol`. |
| `Rol` | Nombre, descripción, `permisos` (arreglo JSONB de strings tipo `"productos.write"`), y flags `esDefault`/`estado`. |
| `Categoria` | Categorías de productos (nombre único). |
| `Marca` | Marcas de producto. |
| `Producto` | Catálogo de productos de la tienda: precio, stock, stock mínimo, precio de compra, imagen, y relaciones a `Categoria` y `Marca`. |
| `Pedido` | Pedido/venta de un cliente: productos (JSONB), subtotal/total/total pagado, `estadoPedido`, `estadoVenta`, `esVenta`, `tipoVenta` (mostrador/domicilio), dirección de entrega. |
| `Pago` | Pagos/abonos asociados a un `Pedido`: monto, método, estado, tipo (`pago_total`/abono), comprobante. |
| `Domicilio` | Entrega a domicilio asociada 1 a 1 a un `Pedido` (índice único `pedido_id`), con repartidor, dirección, costo/tarifa y estado. |
| `Banner` | Banners promocionales del home, con layout tipo collage (`single`, `duo`, `trio`, `grid-4`, `grid-6`, `mosaic-8`), imágenes por slot (JSONB) y posición de texto. |

Relaciones principales: `Categoria`/`Marca` 1—N `Producto`; `Rol` 1—N `Usuario`; `Usuario` 1—N `Pedido`; `Pedido` 1—N `Pago` y 1—1 `Domicilio`.

## Autenticación y permisos

- **JWT**: al hacer login (`POST /api/auth/login`) se firma un token con `{ documento, rol, nombre }` usando `JWT_SECRET`, con expiración `JWT_EXPIRES_IN`. Las rutas protegidas requieren el header `Authorization: Bearer <token>`.
- **`verifyToken`**: valida el token y adjunta el payload en `req.user`.
- **`checkRole(roles)`**: exige que `req.user.rol` esté en la lista de roles permitida. Los roles `ADMIN`/`ADMINISTRADOR` siempre tienen acceso, sin importar la lista.
- **`checkPermission(permiso)`**: busca al usuario en base de datos junto a su `Rol` y verifica que el arreglo `permisos` del rol contenga el permiso solicitado (por ejemplo `domicilios.write`). Los roles `ADMIN`/`ADMINISTRADOR` siempre pasan.
- **`checkRoleOrPermission(roles, permiso)`**: permite el acceso si el rol del usuario está en la lista o si su rol tiene el permiso indicado.
- **`allowSelfOrAdmin`**: permite la acción si el usuario autenticado es `ADMIN` o si el recurso (`:id` en la URL) pertenece al propio usuario (comparando `documento`).

El rol `ADMIN` que crea `src/server.js` al arrancar incluye permisos sobre los módulos: `ventas`, `pedidos`, `pagos`, `domicilios`, `productos`, `categorias`, `marcas`, `usuarios`, `roles`, `config` y `reportes` (lectura/escritura/eliminación según el módulo).

## Endpoints de la API

Prefijo base: `http://localhost:<PORT>/api`. "Acceso" indica el middleware aplicado en la ruta; "Público" significa que no requiere token.

### Autenticación — `/auth`

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/register` | Público |
| POST | `/login` | Público |
| POST | `/forgot-password` | Público |
| POST | `/reset-password` | Público |
| GET | `/me` | Autenticado |
| POST | `/change-password` | Autenticado |

### Roles — `/roles`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/nombre/:nombre` | Público |
| GET | `/permisos` | Público |
| POST | `/seed` | Público (crea roles por defecto si no existen) |
| GET | `/` | ADMIN |
| POST | `/` | ADMIN |
| GET | `/:id` | Autenticado |
| PUT | `/:id` | ADMIN |
| DELETE | `/:id` | ADMIN |
| PATCH | `/:id/estado` | ADMIN |

### Usuarios — `/usuarios`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/direcciones` | Autenticado |
| POST | `/direcciones` | Autenticado |
| PUT | `/direcciones/:id` | Autenticado |
| DELETE | `/direcciones/:id` | Autenticado |
| PATCH | `/direcciones/:id/predeterminada` | Autenticado |
| GET | `/` | ADMIN |
| POST | `/` | ADMIN |
| GET | `/documento/:documento` | ADMIN |
| GET | `/:id` | Propio usuario o ADMIN |
| PUT | `/:id` | Propio usuario o ADMIN |
| DELETE | `/:id` | ADMIN |
| PATCH | `/:id/estado` | ADMIN |

### Categorías — `/categorias`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | Público |
| GET | `/export` | Público (Excel) |
| POST | `/` | ADMIN |
| POST | `/import` | ADMIN (Excel, campo `file`) |
| GET | `/:id` | ADMIN |
| PUT | `/:id` | ADMIN |
| DELETE | `/:id` | ADMIN |
| PATCH | `/:id/estado` | ADMIN |

### Marcas — `/marcas`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | Público |
| GET | `/export` | Público (Excel) |
| POST | `/` | ADMIN |
| POST | `/import` | ADMIN (Excel, campo `file`) |
| GET | `/:id` | ADMIN |
| PUT | `/:id` | ADMIN |
| DELETE | `/:id` | ADMIN |
| PATCH | `/:id/estado` | ADMIN |

### Productos — `/productos`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | Público |
| GET | `/stock-bajo` | ADMIN |
| POST | `/` | ADMIN |
| POST | `/import` | ADMIN (Excel, campo `file`) |
| GET | `/export` | ADMIN (Excel) |
| GET | `/:id` | Autenticado |
| PUT | `/:id` | ADMIN |
| PATCH | `/:id/estado` | ADMIN |
| DELETE | `/:id` | ADMIN |

### Pedidos / Ventas — `/pedidos`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | ADMIN (pedidos activos) |
| GET | `/ventas` | ADMIN (histórico de ventas) |
| GET | `/mis-pedidos` | Autenticado |
| POST | `/` | Autenticado (crear pedido) |
| GET | `/:id` | Autenticado |
| PUT | `/:id` | ADMIN |
| DELETE | `/:id` | ADMIN (cancelar) |
| PATCH | `/:id/estado` | ADMIN |
| POST | `/:id/convertir-venta` | ADMIN |
| PATCH | `/:id/aprobar-abono` (alias `/:id/aprobar`) | ADMIN |
| PATCH | `/:id/rechazar-abono` (alias `/:id/rechazar`) | ADMIN |

### Pagos — `/pagos`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | ADMIN |
| GET | `/mis-pagos` | Autenticado |
| POST | `/` | ADMIN |
| GET | `/:id` | ADMIN |
| PUT | `/:id` | ADMIN |
| PATCH | `/:id/estado` | ADMIN |

### Domicilios — `/domicilios`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | ADMIN |
| POST | `/` | ADMIN |
| GET | `/:id` | ADMIN |
| PUT / PATCH | `/:id` | ADMIN |
| PATCH | `/:id/estado` | ADMIN |
| PATCH | `/:id/convertir` | ADMIN |
| PATCH | `/:id/tarifa` | ADMIN |
| PATCH | `/:id/repartidor` | ADMIN |
| GET | `/usuario/:usuarioId` | ADMIN |
| GET | `/tarifas` | ADMIN |
| POST | `/tarifas` | ADMIN |
| PUT | `/tarifas/:id` | ADMIN |
| DELETE | `/tarifas/:id` | ADMIN |
| GET | `/mis-domicilios` | Autenticado |
| GET | `/mis-pedidos-domicilio` | Autenticado |
| PATCH | `/:id/estado-repartidor` | Permiso `domicilios.write` |

### Dashboard — `/dashboard`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | ADMIN |
| GET | `/ventas/dia` | ADMIN |
| GET | `/ventas/semana` | ADMIN |
| GET | `/ventas/mes` | ADMIN |
| GET | `/productos/mas-vendidos` | ADMIN |
| GET | `/stock-bajo` | ADMIN |
| GET | `/pedidos/pendientes` | ADMIN |
| GET | `/ventas/por-cliente` | ADMIN |
| GET | `/domicilios/eficiencia` | ADMIN |

### Banners — `/banners`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | Público (solo banners activos) |
| POST | `/` | ADMIN |
| PUT | `/:id` | ADMIN |
| DELETE | `/:id` | ADMIN |

### Carrito — `/carrito`

Todas las rutas requieren autenticación (el carrito se asocia al usuario logueado).

| Método | Ruta |
|---|---|
| GET | `/` |
| POST | `/items` |
| PUT | `/items/:productoId` |
| DELETE | `/items/:productoId` |
| DELETE | `/` (vaciar carrito) |

### Subida de imágenes — `/upload`

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | ADMIN (lista imágenes por carpeta en Cloudinary) |
| POST | `/` | ADMIN (sube imagen, campo `imagen`, máx. 8MB) |
| DELETE | `/` | ADMIN (elimina imagen por `publicId`) |

## Subida de imágenes (Cloudinary)

El módulo `upload` (`src/api/upload/upload.controller.js`) sube archivos a Cloudinary usando `multer` en memoria y `cloudinary.uploader.upload_stream`. Cada imagen se guarda bajo el prefijo `sisgem/<folder>` (carpeta por defecto `general`, validada con una expresión regular), se redimensiona a un ancho máximo configurable (200–2000px, por defecto 1600px) y se sirve con `quality: auto` y `fetch_format: auto` para optimizar peso. Este mismo mecanismo de Cloudinary es el que respalda las imágenes de productos, marcas y banners en el resto de la API.

## Recuperación de contraseña

Flujo de `POST /api/auth/forgot-password` y `POST /api/auth/reset-password` (`src/api/auth/auth.controller.js`):

1. El usuario envía su email a `forgot-password`. El endpoint **siempre responde el mismo mensaje genérico** ("Si el correo está registrado, se ha enviado un enlace de recuperación a esa dirección"), exista o no una cuenta con ese email, y con el mismo código 200. Esto evita que el endpoint se use para averiguar qué correos están registrados en el sistema (enumeración de usuarios).
2. Si el email sí corresponde a un usuario, el backend genera un JWT de un solo propósito (`type: 'password-reset'`, expira en 1 hora) y lo envía **solo por correo**, dentro de un enlace `FRONTEND_URL/reset-password?token=<token>`. El token nunca se devuelve en la respuesta HTTP.
3. El envío de correo se hace vía la API HTTP de Brevo (`src/utils/sendEmail.js`). Si no hay `BREVO_API_KEY`/`MAIL_FROM` configuradas, el correo no se envía y solo se registra una advertencia en consola (para poder probar el flujo en desarrollo sin Brevo real).
4. El frontend llama a `reset-password` con el `token` del enlace y la nueva contraseña. El backend verifica la firma y el tipo del token, valida que la contraseña tenga al menos 6 caracteres, y actualiza la contraseña del usuario (rehasheada por el hook `beforeUpdate` del modelo `Usuario`).

## Exportación / Importación en Excel

Usando la librería `xlsx`, los módulos de **categorías**, **marcas** y **productos** exponen endpoints `GET /export` (descarga en Excel) e `POST /import` (carga masiva desde un archivo Excel enviado como `multipart/form-data` en el campo `file`). No hay endpoints de exportación/importación Excel para pagos u otros módulos en el código actual.

## Usuario administrador por defecto

No hay ningún usuario administrador con credenciales fijas: `src/server.js` (24 líneas) solo verifica la conexión a PostgreSQL y levanta el servidor, sin tocar la tabla de usuarios. El único administrador inicial se crea con:

```bash
npm run seed:db
```

a partir de las variables `ADMIN_*` de tu propio `.env` (ver la tabla de variables de entorno más arriba) — nunca con valores hardcodeados. El script es idempotente: si ya existe un usuario con el correo `ADMIN_EMAIL`, no hace nada.

## Notas adicionales

- CORS usa una lista blanca de orígenes permitidos (`src/app.js`), construida a partir de `CORS_ORIGINS`/`FRONTEND_URL` más `http://localhost:5173` en desarrollo — no acepta cualquier origen. Las solicitudes sin cabecera `Origin` (curl, apps nativas) siempre se permiten. Métodos habilitados: `GET, POST, PUT, DELETE, PATCH, OPTIONS`.
- Las respuestas siguen un formato uniforme (`src/utils/helpers.js`): `{ success: true, message, data, status }` en éxito y `{ success: false, message, status }` en error — incluidas la raíz `GET /`, las rutas no reconocidas (`404`) y las que exigen autenticación (`401`).
- Las rutas no reconocidas responden `404` con `{ success: false, message: 'El recurso solicitado no fue encontrado.', status: 404 }`; los errores no controlados son capturados por un middleware global que responde `500`.
