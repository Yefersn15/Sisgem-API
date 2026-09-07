const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const Usuario = sequelize.define('Usuario', {
  documento: {
    type: DataTypes.STRING(20),
    primaryKey: true
  },
  tipoDocumento: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'CC',
    field: 'tipo_documento'
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  genero: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  barrio: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fotoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'foto_url'
  },
  direcciones: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  rolId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'rol_id'
  },
  esAdminPrincipal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'es_admin_principal'
    // true solo para la cuenta creada por `npm run seed:db` a partir de
    // ADMIN_EMAIL. Bloqueada en usuarios.service.js: nadie (ni ella misma)
    // puede cambiarle el rol, desactivarla, eliminarla ni cambiarle la
    // contraseña desde la aplicación — solo desde el servidor.
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

Usuario.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = Usuario;