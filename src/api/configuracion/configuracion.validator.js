const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const horarioReglaSchema = z.object({
  dias: z.array(z.string()),
  apertura: z.string().optional(),
  cierre: z.string().optional(),
  cerrado: z.boolean().optional()
});

const temaSchema = z.object({
  colorAcento: z.string().optional()
});

const actualizarSchema = z.object({
  nombreTienda: z.string().trim().min(2, 'El nombre de la tienda es obligatorio').max(150).optional(),
  logoUrl: z.string().optional().nullable(),
  descripcion: z.string().max(2000).optional().nullable(),
  direccion: z.string().max(200).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  email: z.union([z.string().email('Ingresa un correo válido'), z.literal('')]).optional().nullable(),
  horario: z.array(horarioReglaSchema).optional(),
  tema: temaSchema.optional(),
  mapaEmbedUrl: z.string().optional().nullable()
});

// Middleware factory: valida req.body contra el schema dado y responde 400
// con el primer mensaje de error si no pasa.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const primerError = result.error.issues[0];
    return errorResponse(res, primerError?.message || 'Datos inválidos', 400);
  }
  req.body = result.data;
  next();
};

module.exports = { validate, actualizarSchema };
