// npm run seed:db
// Crea el rol ADMIN (si no existe) y el usuario administrador inicial a
// partir de variables de entorno (nunca hardcodeadas en el código). La
// contraseña se hashea automáticamente con bcrypt vía el hook
// beforeCreate del modelo Usuario. Es idempotente: si ya existe un usuario
// con ese correo, no se toca (para no resetear una contraseña que el admin
// ya haya cambiado).
require('dotenv').config();
const { sequelize, Rol, Usuario } = require('../src/models');
const { PERMISOS_DISPONIBLES, ROLES_BASE } = require('../src/constants/permisos');

const REQUERIDAS = ['ADMIN_DOCUMENTO', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NOMBRE', 'ADMIN_APELLIDO'];

const run = async () => {
  const faltantes = REQUERIDAS.filter((key) => !process.env[key]);
  if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno para crear el admin: ${faltantes.join(', ')}`);
  }

  const {
    ADMIN_DOCUMENTO,
    ADMIN_TIPO_DOCUMENTO,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_NOMBRE,
    ADMIN_APELLIDO,
    ADMIN_TELEFONO,
    ADMIN_GENERO,
    ADMIN_DIRECCION,
    ADMIN_BARRIO,
  } = process.env;

  if (ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  }

  await sequelize.authenticate();

  const [rol] = await Rol.findOrCreate({
    where: { nombre: 'ADMIN' },
    defaults: {
      nombre: 'ADMIN',
      descripcion: 'Administrador del sistema con acceso total',
      permisos: PERMISOS_DISPONIBLES,
      esDefault: false,
      estado: true,
    },
  });

  // Roles base (GERENTE, CAJERO, DOMICILIARIO, CLIENTE): se crean junto con
  // ADMIN para que un despliegue nuevo (o uno ya existente, corriendo este
  // script de nuevo) siempre tenga los 5 roles disponibles para asignar
  // desde el panel. findOrCreate es idempotente: si un rol con ese nombre
  // ya existe (por ejemplo porque un admin ya editó sus permisos desde la
  // UI), no lo toca.
  for (const roleData of ROLES_BASE) {
    await Rol.findOrCreate({ where: { nombre: roleData.nombre }, defaults: roleData });
  }

  const existente = await Usuario.findOne({ where: { email: ADMIN_EMAIL } });
  if (existente) {
    console.log(`Ya existe un usuario con el correo ${ADMIN_EMAIL}; no se crea de nuevo.`);
    return;
  }

  await Usuario.create({
    documento: ADMIN_DOCUMENTO,
    tipoDocumento: ADMIN_TIPO_DOCUMENTO || 'CC',
    nombre: ADMIN_NOMBRE,
    apellido: ADMIN_APELLIDO,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    telefono: ADMIN_TELEFONO || null,
    genero: ADMIN_GENERO || null,
    direccion: ADMIN_DIRECCION || null,
    barrio: ADMIN_BARRIO || null,
    estado: true,
    rolId: rol.id,
    esAdminPrincipal: true,
  });

  console.log(`Administrador creado: ${ADMIN_EMAIL}`);
};

let exitCode = 0;
run()
  .catch((error) => {
    console.error('Error creando el administrador:', error.message);
    exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
    process.exit(exitCode);
  });
