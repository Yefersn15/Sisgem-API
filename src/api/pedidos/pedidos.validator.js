const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const crearSchema = z.object({
  tipo_venta: z.enum(['mostrador', 'domicilio']).optional(),
  metodo_pago: z.string().optional(),
  telefonoContacto: z.string().optional(),
  observaciones: z.string().optional(),
  direccion: z.any().optional(),
  productos: z.array(z.object({
    producto: z.union([z.string(), z.number()]),
    cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
    precio_unitario: z.coerce.number().min(0, 'El precio unitario no puede ser negativo'),
  })).min(1, 'Se requiere al menos un producto'),
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
