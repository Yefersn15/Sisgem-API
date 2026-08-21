const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const crearSchema = z.object({
  pedidoId: z.coerce.number().int('El ID del pedido es obligatorio'),
  direccion: z.any().optional(),
  tarifa: z.any().optional(),
  repartidor: z.any().optional(),
  telefono_repartidor: z.string().optional(),
  ciudad: z.string().optional(),
  barrio: z.string().optional(),
  telefono: z.string().optional(),
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
