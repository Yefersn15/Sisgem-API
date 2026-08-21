// Validación de entrada con zod. Reemplaza la validación manual/ausente
// que antes vivía dispersa dentro del controlador.
const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const crearSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  permisos: z.array(z.string()).optional(),
  esDefault: z.boolean().optional(),
  estado: z.boolean().optional(),
});

const actualizarSchema = crearSchema.partial();

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

module.exports = { validate, crearSchema, actualizarSchema };
