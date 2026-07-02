const { Marca, Proveedor } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.listar = async (req, res) => {
  try {
    const { estado, proveedor } = req.query;
    const where = {};

    const isStaff = req.user && ['ADMIN', 'EMPLEADO'].includes(req.user.rol);
    if (req.user && !isStaff) {
      where.estado = true;
    } else if (estado !== undefined) {
      where.estado = estado === 'true';
    }

    if (req.user && req.user.rol === 'PROVEEDOR' && req.user.proveedor) {
      where.proveedorId = req.user.proveedor;
    } else if (proveedor) {
      where.proveedorId = proveedor;
    }

    const marcas = await Marca.findAll({
      where,
      include: [{ model: Proveedor, attributes: ['nombre'], as: 'proveedor' }],
      order: [['nombre', 'ASC']]
    });
    return successResponse(res, marcas);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, descripcion, logo, proveedorId, sitioWeb } = req.body;

    const existe = await Marca.findOne({ where: { nombre: nombre.toUpperCase() } });
    if (existe) {
      return errorResponse(res, 'La marca ya existe', 400);
    }

    const nuevaMarca = await Marca.create({
      nombre: nombre.toUpperCase(),
      descripcion,
      logo,
      proveedorId,
      sitioWeb
    });

    return successResponse(res, nuevaMarca, 'Marca creada exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const marca = await Marca.findByPk(id, {
      include: [{ model: Proveedor, attributes: ['nombre'], as: 'proveedor' }]
    });
    if (!marca) {
      return errorResponse(res, 'Marca no encontrada', 404);
    }

    return successResponse(res, marca);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, logo, proveedorId, sitioWeb, estado } = req.body;

    const marca = await Marca.findByPk(id);
    if (!marca) {
      return errorResponse(res, 'Marca no encontrada', 404);
    }

    if (nombre && nombre.toUpperCase() !== marca.nombre) {
      const existe = await Marca.findOne({ where: { nombre: nombre.toUpperCase() } });
      if (existe) {
        return errorResponse(res, 'La marca ya existe', 400);
      }
    }

    await marca.update({
      nombre: nombre ? nombre.toUpperCase() : marca.nombre,
      descripcion: descripcion !== undefined ? descripcion : marca.descripcion,
      logo: logo !== undefined ? logo : marca.logo,
      proveedorId: proveedorId !== undefined ? proveedorId : marca.proveedorId,
      sitioWeb: sitioWeb !== undefined ? sitioWeb : marca.sitioWeb,
      estado: estado !== undefined ? estado : marca.estado
    });

    return successResponse(res, marca, 'Marca actualizada exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const marca = await Marca.findByPk(id);
    if (!marca) {
      return errorResponse(res, 'Marca no encontrado', 404);
    }

    await marca.destroy();

    return successResponse(res, null, 'Marca eliminada exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const marca = await Marca.findByPk(id);
    if (!marca) {
      return errorResponse(res, 'Marca no encontrada', 404);
    }

    await marca.update({ estado });

    return successResponse(res, marca, 'Estado actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.importar = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No se ha proporcionado un archivo', 400);
    }
    return errorResponse(res, 'Funcionalidad de importación en desarrollo', 501);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.exportar = async (req, res) => {
  try {
    const marcas = await Marca.findAll({
      include: [{ model: Proveedor, attributes: ['nombre'], as: 'proveedor' }],
      order: [['nombre', 'ASC']]
    });
    return successResponse(res, marcas);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};