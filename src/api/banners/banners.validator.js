// Validación de entrada con zod. Solo normaliza tipos básicos: la
// validación de negocio (plantilla reconocida, cantidad de imágenes por
// plantilla, URLs presentes, posición de texto válida) vive en
// banners.service.js (validarBanner) porque depende de la plantilla elegida
// y, en actualizar, del banner existente — no es un chequeo de forma fijo.
const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const crearSchema = z.object({
  layout: z.string().optional(),
  images: z.array(z.any()).optional(),
  titulo: z.string().optional(),
  texto: z.string().optional(),
  textPosition: z.string().optional(),
  displayOrder: z.coerce.number().int().optional(),
  estado: z.boolean().optional(),
});

const actualizarSchema = crearSchema;

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
