# SISGEM API

Backend de SISGEM construido con Node.js, Express, Sequelize y PostgreSQL.

## Requisitos

- Node.js 18 o superior
- PostgreSQL 14 o superior
- npm

## Instalación

1. Entrar al directorio del proyecto:
   ```bash
   cd Sisgem-API
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Crear una base de datos PostgreSQL (por ejemplo: `sisgem_db`).
4. Copiar el ejemplo de variables de entorno:
   ```bash
   copy .env.example .env
   ```
5. Ajustar los valores de `.env` según tu entorno.

## Variables de entorno

El archivo `.env` debe incluir al menos:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sisgem_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=cambia_esta_clave_por_una_mas_segura
JWT_EXPIRES_IN=1d
```

## Ejecución

Iniciar el servidor:

```bash
npm start
```

La API quedará disponible en:

```text
http://localhost:3000
```

## Notas

- Al iniciar, la API intentará sincronizar los modelos con PostgreSQL.
- Se creará un usuario administrador por defecto con:
  - Email: `admin@sisgem.com`
  - Contraseña: `Admin123!`
