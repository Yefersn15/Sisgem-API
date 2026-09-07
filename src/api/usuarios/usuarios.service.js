// Lógica de negocio y acceso a datos de usuarios (incluye el sub-recurso
// "direcciones", que vive como columna JSONB dentro del mismo registro de
// usuario, por eso no se separó en su propia carpeta de feature).
const { Op } = require('sequelize');
const repository = require('./usuarios.repository');
const { Rol } = require('../../models');
const AppError = require('../../utils/AppError');

exports.listar = async ({ estado, rol, search, pagination }) => {
  const where = {};
  if (estado !== undefined) where.estado = estado === 'true';
  if (rol) where.rolId = rol;
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.iLike]: `%${search}%` } },
      { apellido: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { documento: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return repository.findAndCountAll({ where, pagination });
};

exports.crear = async (data) => {
  const { nombre, email, password, telefono, apellido, rolId, documento, tipoDocumento, genero, direccion, barrio } = data;

  const existeUsuario = await repository.findByEmail(email);
  if (existeUsuario) throw new AppError('El email ya está registrado', 400);

  if (documento) {
    const existeDocumento = await repository.findById(documento);
    if (existeDocumento) throw new AppError('El documento ya está registrado', 400);
  }

  let defaultRolId = rolId;
  if (!defaultRolId) {
    const defaultRol = await Rol.findOne({ where: { esDefault: true, estado: true } });
    defaultRolId = defaultRol ? defaultRol.id : 1;
  }

  const nuevoUsuario = await repository.create({
    documento,
    tipoDocumento: tipoDocumento || 'CC',
    nombre,
    apellido,
    email,
    password,
    telefono,
    genero,
    direccion,
    barrio,
    rolId: defaultRolId
  });

  return repository.findByIdConRolSinPassword(nuevoUsuario.documento);
};

exports.obtenerPorDocumento = async (documento) => {
  const usuario = await repository.findByDocumentoConRolSinPassword(documento);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
};

exports.obtenerPorId = async (id) => {
  const usuario = await repository.findByIdConRolSinPassword(id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
};

// `requester`: viene de req.user (el usuario autenticado que hace la
// petición). La cuenta esAdminPrincipal (creada por npm run seed:db) no
// puede ser tocada por nadie más, y ni ella misma puede cambiarse el rol,
// el estado o la contraseña desde la aplicación — solo datos de contacto.
exports.actualizar = async (id, data, requester) => {
  const { nombre, apellido, telefono, rolId, email, tipoDocumento, genero, direccion, barrio, estado, password } = data;

  const usuario = await repository.findById(id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  if (usuario.esAdminPrincipal) {
    if (requester && String(requester.documento) !== String(usuario.documento)) {
      throw new AppError('La cuenta del administrador principal no puede ser modificada por otro usuario.', 403);
    }
    if (rolId !== undefined || estado !== undefined || password) {
      throw new AppError('La cuenta del administrador principal no puede cambiar de rol, desactivarse ni cambiar su contraseña desde la aplicación. Usa "npm run seed:db" en el servidor.', 403);
    }
  }

  if (email && email !== usuario.email) {
    const existeEmail = await repository.findByEmail(email);
    if (existeEmail) throw new AppError('El email ya está en uso', 400);
  }

  await usuario.update({
    nombre: nombre || usuario.nombre,
    apellido: apellido !== undefined ? apellido : usuario.apellido,
    telefono: telefono !== undefined ? telefono : usuario.telefono,
    rolId: rolId !== undefined && rolId !== '' ? rolId : usuario.rolId,
    email: email || usuario.email,
    tipoDocumento: tipoDocumento || usuario.tipoDocumento,
    genero: genero !== undefined ? genero : usuario.genero,
    direccion: direccion !== undefined ? direccion : usuario.direccion,
    barrio: barrio !== undefined ? barrio : usuario.barrio,
    estado: estado !== undefined ? estado : usuario.estado
  });

  return repository.findByIdConRolSinPassword(usuario.documento);
};

exports.eliminar = async (id) => {
  const usuario = await repository.findById(id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  if (usuario.esAdminPrincipal) {
    throw new AppError('La cuenta del administrador principal no se puede eliminar.', 403);
  }
  await usuario.destroy();
};

exports.cambiarEstado = async (id, estado) => {
  const usuario = await repository.findByIdConRolNombreSinPassword(id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  if (usuario.esAdminPrincipal) {
    throw new AppError('La cuenta del administrador principal no se puede desactivar.', 403);
  }
  await usuario.update({ estado });
  return usuario;
};

// ---- Direcciones (sub-recurso JSONB del propio usuario autenticado) ----

exports.listarDirecciones = async (documento) => {
  const usuario = await repository.findByIdSoloDirecciones(documento);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario.direcciones || [];
};

exports.agregarDireccion = async (documento, data) => {
  const { nombre, direccion, direccion2, barrio, telefono } = data;
  const usuario = await repository.findById(documento);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  if (!direccion || !barrio) throw new AppError('Dirección y barrio son requeridos', 400);

  const direcciones = usuario.direcciones || [];
  if (direcciones.length >= 3) throw new AppError('Máximo 3 direcciones guardadas', 400);

  const existeDireccion = direcciones.some(d =>
    d.direccion.toLowerCase() === direccion.toLowerCase() &&
    d.barrio.toLowerCase() === barrio.toLowerCase()
  );
  if (existeDireccion) throw new AppError('Esta dirección ya está guardada', 400);

  const esPredeterminada = direcciones.length === 0;
  // OJO: se construye un array NUEVO (no direcciones.push(...) sobre el
  // mismo array) porque Sequelize no detecta como "changed" una mutación
  // in-place de un campo JSONB cuando la referencia no cambia — el guardado
  // fallaría en silencio y la dirección "desaparecería" al recargar.
  const nuevasDirecciones = [...direcciones, {
    nombre: nombre || 'Principal',
    direccion,
    direccion2: direccion2 || '',
    barrio,
    telefono: telefono || '',
    es_predeterminada: esPredeterminada
  }];

  await usuario.update({ direcciones: nuevasDirecciones });
  return nuevasDirecciones;
};

exports.actualizarDireccion = async (documento, id, data) => {
  const { nombre, direccion, direccion2, barrio, telefono, es_predeterminada } = data;
  const usuario = await repository.findById(documento);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  const direcciones = usuario.direcciones || [];
  const dirIndex = direcciones.findIndex(d => d.nombre === id || d.nombre === `direccion_${id}`);
  if (dirIndex === -1) throw new AppError('Dirección no encontrada', 404);

  if (direccion && barrio) {
    const existeDireccion = direcciones.some((d, i) =>
      i !== dirIndex &&
      d.direccion.toLowerCase() === direccion.toLowerCase() &&
      d.barrio.toLowerCase() === barrio.toLowerCase()
    );
    if (existeDireccion) throw new AppError('Esta dirección ya está guardada', 400);
  }

  const nuevasDirecciones = direcciones.map((d, i) => {
    if (i !== dirIndex) {
      return es_predeterminada ? { ...d, es_predeterminada: false } : d;
    }
    return {
      ...d,
      nombre: nombre || d.nombre,
      direccion: direccion || d.direccion,
      direccion2: direccion2 !== undefined ? direccion2 : d.direccion2,
      barrio: barrio || d.barrio,
      telefono: telefono !== undefined ? telefono : d.telefono,
      es_predeterminada: es_predeterminada ? true : d.es_predeterminada
    };
  });

  await usuario.update({ direcciones: nuevasDirecciones });
  return nuevasDirecciones;
};

exports.eliminarDireccion = async (documento, id) => {
  const usuario = await repository.findById(documento);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  const direcciones = usuario.direcciones || [];
  const dirIndex = direcciones.findIndex(d => d.nombre === id);
  if (dirIndex === -1) throw new AppError('Dirección no encontrada', 404);

  const eraPredeterminada = direcciones[dirIndex].es_predeterminada;
  const nuevasDirecciones = direcciones.filter((_, i) => i !== dirIndex);
  if (eraPredeterminada && nuevasDirecciones.length > 0) {
    nuevasDirecciones[0] = { ...nuevasDirecciones[0], es_predeterminada: true };
  }

  await usuario.update({ direcciones: nuevasDirecciones });
  return nuevasDirecciones;
};

exports.direccionPredeterminada = async (documento, id) => {
  const usuario = await repository.findById(documento);
  if (!usuario) throw new AppError('Usuario no encontrado', 404);

  const direcciones = usuario.direcciones || [];
  const dirIndex = direcciones.findIndex(d => d.nombre === id);
  if (dirIndex === -1) throw new AppError('Dirección no encontrada', 404);

  const nuevasDirecciones = direcciones.map((d, i) => ({ ...d, es_predeterminada: i === dirIndex }));
  await usuario.update({ direcciones: nuevasDirecciones });
  return nuevasDirecciones;
};
