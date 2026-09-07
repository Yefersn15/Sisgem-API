const { z } = require('zod');
const { errorResponse } = require('../../utils/helpers');

const crearSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellido: z.string().optional(),
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  documento: z.string().trim().min(1, 'El documento es obligatorio'),
  tipoDocumento: z.string().optional(),
  telefono: z.string().optional(),
  genero: z.string().optional(),
  direccion: z.string().optional(),
  barrio: z.string().optional(),
  fotoUrl: z.string().optional(),
  rolId: z.coerce.number().int().optional(),
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
