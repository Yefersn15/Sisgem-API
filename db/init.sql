-- Creación manual de la base de datos (alternativa a `npm run db:init`,
-- que hace esto mismo automáticamente con las credenciales de tu .env).
--
-- Uso: conéctate a Postgres con un usuario que pueda crear bases de datos
-- (por defecto, "postgres") y ejecuta este archivo:
--
--   psql -U postgres -f db/init.sql
--
-- Las TABLAS no se crean aquí: su definición vive únicamente en los
-- modelos de Sequelize (src/models/*.js) para no duplicar el esquema en
-- dos lugares. Después de crear la base de datos, corre:
--
--   npm run db:init     -- crea/actualiza las tablas a partir de los modelos
--   npm run seed:db      -- crea el usuario ADMIN inicial (ver .env.example)

CREATE DATABASE sisgem_db;
