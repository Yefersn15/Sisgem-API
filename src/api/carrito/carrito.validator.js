// Validación de entrada con zod. Se limita a un chequeo de forma (entero
// positivo) sobre `cantidad`/`productoId`; los chequeos de negocio (campo
// requerido, existencia del producto, stock disponible) siguen viviendo en
// el service, que conserva los mensajes exactos que ya tenía la API.
const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const agregarItemSchema = z.object({
  productoId: z.coerce.number().int().positive('ID de producto requerido').optional(),
  cantidad: z.coerce.number().int().positive('Cantidad debe ser mayor a 0').optional().default(1),
});

const actualizarItemSchema = z.object({
  cantidad: z.coerce.number().int().positive('Cantidad debe ser mayor a 0').optional(),
});

// Middleware factory: valida req.body contra el schema dado y responde 400
// con el primer mensaje de error si no pasa. Si pasa, normaliza req.body
// con los datos ya convertidos (coerce) que produce zod.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const primerError = result.error.issues[0];
    return errorResponse(res, primerError?.message || 'Datos inválidos', 400);
  }
  req.body = result.data;
  next();
};

module.exports = { validate, agregarItemSchema, actualizarItemSchema };
