const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Los topes son configurables por env var (útil para ajustarlos en
// producción sin tocar código, y para que la suite de tests use límites
// generosos y no se auto-bloquee con su propio flujo normal). Los valores
// por defecto son los pensados para producción.
//
// `parseInt` NO exige que todo el texto sea un número: solo lee los dígitos
// del principio y corta ahí ("9b907dcf..." se convierte en 9 en vez de
// fallar). Eso causó justamente el bug de producción que motivó este
// comentario: alguien generó por error un valor aleatorio (tipo hash) para
// estas variables en vez de dejarlas vacías o poner un número, y la app
// terminó aplicando límites de 9/38/28 solicitudes sin que nada avisara del
// problema. Por eso aquí se exige que el valor completo sean solo dígitos
// antes de intentar convertirlo — cualquier otra cosa cae al valor por
// defecto en silencio, que es el comportamiento seguro.
const num = (value, fallback) => {
  if (!/^\d+$/.test(String(value ?? '').trim())) return fallback;
  const parsed = parseInt(value, 10);
  return parsed > 0 ? parsed : fallback;
};

// apiLimiter se monta en app.js ANTES que el verifyToken de cada ruta (así
// protege también rutas públicas), así que req.user todavía no existe ahí —
// a diferencia de createLimiter más abajo (que sí corre después de
// verifyToken en cada ruta y puede usar req.user directamente), acá hay que
// decodificar el token una vez, "a mano" y sin lanzar si es inválido: para
// contar la cuota solo hace falta saber quién dice ser, no validar la firma
// con el rigor de una autorización real (eso lo sigue haciendo verifyToken).
const documentoDelToken = (req) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.decode(token)?.documento || null;
  } catch {
    return null;
  }
};

// Límite general para toda la API: contiene abuso/DDoS básico sin afectar
// el uso normal de la tienda. 300/15min (el valor anterior) resultó
// demasiado bajo para un panel admin real: cargar el dashboard o navegar
// entre módulos dispara fácilmente 10-20 solicitudes de golpe, y varios
// empleados detrás de la misma IP (oficina, NAT) comparten el mismo cupo.
// Por eso también se cambia la clave: si hay sesión, se cuenta por usuario
// en vez de por IP, para que el tráfico de un empleado no consuma el cupo
// de otro ni al revés.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.API_RATE_LIMIT_MAX, 1500),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => documentoDelToken(req) || ipKeyGenerator(req.ip),
  // handler explícito (en vez de solo `message`) para dejar un rastro en los
  // logs cada vez que ESTE limitador es quien de verdad bloquea una
  // solicitud — necesario para poder distinguirlo de un 429 que llegue
  // impuesto por algo delante de la app (el proxy de Render, por ejemplo),
  // que nunca pasaría por aquí y por lo tanto nunca dejaría este log.
  handler: (req, res, next, options) => {
    const key = documentoDelToken(req) || req.ip;
    console.warn(`[apiLimiter] Límite alcanzado: ${req.method} ${req.originalUrl} (key=${key})`);
    res.status(options.statusCode).json(options.message);
  },
  message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.', status: 429 },
});

// Límite estricto para login/registro/recuperación de contraseña, para
// dificultar ataques de fuerza bruta contra credenciales.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.AUTH_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en unos minutos.', status: 429 },
});

// Evita que un mismo usuario genere registros duplicados presionando
// "comprar/guardar" varias veces en pocos segundos (doble clic, red lenta, etc.).
const createLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: num(process.env.CREATE_RATE_LIMIT_MAX, 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.documento || ipKeyGenerator(req.ip),
  message: { success: false, message: 'Estás enviando solicitudes muy rápido. Espera unos segundos e intenta de nuevo.', status: 429 },
});

module.exports = { apiLimiter, authLimiter, createLimiter };
