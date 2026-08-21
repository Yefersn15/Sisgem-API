// Utilidad de paginación compartida por los controladores "listar".
//
// Compatibilidad: si el cliente no manda ?page=, se sigue devolviendo el
// listado completo (como antes) para no romper pantallas que aún no piden
// páginas ni los usos que necesitan el listado entero (selects de filtros,
// resolución de nombres por id, etc.). Aun así se aplica un tope de
// seguridad para que ninguna consulta pueda devolver un número ilimitado
// de filas.
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SAFETY_CAP = 500;

const getPagination = (req) => {
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);
  const paginated = Number.isInteger(rawPage) && rawPage > 0;

  const page = paginated ? rawPage : 1;
  const limit = paginated
    ? Math.min(Math.max(rawLimit || DEFAULT_LIMIT, 1), MAX_LIMIT)
    : SAFETY_CAP;

  return { page, limit, offset: (page - 1) * limit, paginated };
};

const paginatedResponse = (res, { rows, count }, pagination, message = 'Operación exitosa') => {
  const payload = { success: true, message, data: rows };
  if (pagination.paginated) {
    payload.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pagination.limit)),
    };
  }
  return res.status(200).json(payload);
};

module.exports = { getPagination, paginatedResponse };
