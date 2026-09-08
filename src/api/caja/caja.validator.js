const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const abrirSchema = z.object({
  montoInicial: z.coerce.number().min(0, 'El monto inicial no puede ser negativo'),
  notas: z.string().optional(),
});

const cerrarSchema = z.object({
  montoContado: z.coerce.number().min(0, 'El monto contado no puede ser negativo'),
  notas: z.string().optional(),
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const primerError = result.error.issues[0];
    return errorResponse(res, primerError?.message || 'Datos inválidos', 400);
  }
  req.body = result.data;
  next();
};

module.exports = { validate, abrirSchema, cerrarSchema };
