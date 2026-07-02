const { Proveedor, Usuario, Marca } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.listar = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};

    if (estado !== undefined) {
      where.estado = estado === 'true';
    }

    const proveedores = await Proveedor.findAll({ where, order: [['nombre', 'ASC']] });
    return successResponse(res, proveedores);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  try {
    const { nit, nombre, telefono, email, direccion, ciudad } = req.body;

    const existe = await Proveedor.findOne({ where: { nit } });
    if (existe) {
      return errorResponse(res, 'El NIT ya está registrado', 400);
    }

    const nuevoProveedor = await Proveedor.create({
      nit,
      nombre,
      telefono,
      email,
      direccion,
      ciudad
    });

    return successResponse(res, nuevoProveedor, 'Proveedor creado exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.rol === 'PROVEEDOR') {
      const usuario = await Usuario.findByPk(req.user.documento);
      if (!usuario || usuario.proveedorId !== parseInt(id)) {
        return errorResponse(res, 'No tienes acceso a este proveedor', 403);
      }
    }

    const proveedor = await Proveedor.findByPk(id);
    if (!proveedor) {
      return errorResponse(res, 'Proveedor no encontrado', 404);
    }

    return successResponse(res, proveedor);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nit, nombre, telefono, email, direccion, ciudad, estado } = req.body;

    const proveedor = await Proveedor.findByPk(id);
    if (!proveedor) {
      return errorResponse(res, 'Proveedor no encontrado', 404);
    }

    if (nit && nit !== proveedor.nit) {
      const existe = await Proveedor.findOne({ where: { nit } });
      if (existe) {
        return errorResponse(res, 'El NIT ya está en uso', 400);
      }
    }

    await proveedor.update({
      nit: nit || proveedor.nit,
      nombre: nombre || proveedor.nombre,
      telefono: telefono !== undefined ? telefono : proveedor.telefono,
      email: email !== undefined ? email : proveedor.email,
      direccion: direccion !== undefined ? direccion : proveedor.direccion,
      ciudad: ciudad !== undefined ? ciudad : proveedor.ciudad,
      estado: estado !== undefined ? estado : proveedor.estado
    });

    return successResponse(res, proveedor, 'Proveedor actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const proveedor = await Proveedor.findByPk(id);
    if (!proveedor) {
      return errorResponse(res, 'Proveedor no encontrado', 404);
    }

    await proveedor.destroy();

    return successResponse(res, null, 'Proveedor eliminado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const proveedor = await Proveedor.findByPk(id);
    if (!proveedor) {
      return errorResponse(res, 'Proveedor no encontrado', 404);
    }

    await proveedor.update({ estado });

    return successResponse(res, proveedor, 'Estado actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};