const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Los topes son configurables por env var (útil para ajustarlos en
// producción sin tocar código, y para que la suite de tests use límites
// generosos y no se auto-bloquee con su propio flujo normal). Los valores
// por defecto son los pensados para producción.
const num = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Límite general para toda la API: contiene abuso/DDoS básico sin afectar
// el uso normal de la tienda.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.API_RATE_LIMIT_MAX, 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});

// Límite estricto para login/registro/recuperación de contraseña, para
// dificultar ataques de fuerza bruta contra credenciales.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.AUTH_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

// Evita que un mismo usuario genere registros duplicados presionando
// "comprar/guardar" varias veces en pocos segundos (doble clic, red lenta, etc.).
const createLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: num(process.env.CREATE_RATE_LIMIT_MAX, 3),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.documento || ipKeyGenerator(req.ip),
  message: { success: false, message: 'Estás enviando solicitudes muy rápido. Espera unos segundos e intenta de nuevo.' },
});

module.exports = { apiLimiter, authLimiter, createLimiter };
