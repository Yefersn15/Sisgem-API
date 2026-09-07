// Lógica de negocio de la configuración del sitio. Fila única (id=1):
// obtener() la crea con los valores por defecto del modelo si todavía no existe.
const { Configuracion } = require('../../models');

exports.obtener = async () => {
  const [config] = await Configuracion.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1 }
  });
  return config;
};

exports.actualizar = async (data) => {
  const config = await exports.obtener();
  const { nombreTienda, logoUrl, descripcion, direccion, telefono, email, horario, tema, mapaEmbedUrl } = data;

  await config.update({
    nombreTienda: nombreTienda !== undefined ? nombreTienda : config.nombreTienda,
    logoUrl: logoUrl !== undefined ? logoUrl : config.logoUrl,
    descripcion: descripcion !== undefined ? descripcion : config.descripcion,
    direccion: direccion !== undefined ? direccion : config.direccion,
    telefono: telefono !== undefined ? telefono : config.telefono,
    email: email !== undefined ? email : config.email,
    horario: horario !== undefined ? horario : config.horario,
    tema: tema !== undefined ? tema : config.tema,
    mapaEmbedUrl: mapaEmbedUrl !== undefined ? mapaEmbedUrl : config.mapaEmbedUrl
  });

  return config;
};
