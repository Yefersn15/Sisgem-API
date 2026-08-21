const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const crearSchema = z.object({
  pedidoId: z.coerce.number().int('El ID del pedido es obligatorio'),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  metodo: z.string().trim().min(1, 'El método de pago es obligatorio'),
  estado: z.string().optional(),
  referencia: z.string().optional(),
  notas: z.string().optional(),
  tipo: z.string().optional(),
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

module.exports = { validate, crearSchema };
