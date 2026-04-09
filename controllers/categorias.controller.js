const { Categoria, Producto } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.listar = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};

    const isStaff = req.user && ['ADMIN', 'EMPLEADO'].includes(req.user.rol);
    if (req.user && !isStaff) {
      where.estado = true;
    } else if (estado !== undefined) {
      where.estado = estado === 'true';
    }

    const categorias = await Categoria.findAll({
      where,
      order: [['nombre', 'ASC']]
    });
    return successResponse(res, categorias);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, descripcion, fotoUrl } = req.body;

    const existeCategoria = await Categoria.findOne({ 
      where: { nombre: nombre.toUpperCase() } 
    });
    if (existeCategoria) {
      return errorResponse(res, 'La categoría ya existe', 400);
    }

    const nuevaCategoria = await Categoria.create({
      nombre: nombre.toUpperCase(),
      descripcion,
      fotoUrl
    });

    return successResponse(res, nuevaCategoria, 'Categoría creada exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    return successResponse(res, categoria);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fotoUrl, estado } = req.body;

    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    if (nombre && nombre.toUpperCase() !== categoria.nombre) {
      const existe = await Categoria.findOne({ 
        where: { nombre: nombre.toUpperCase() } 
      });
      if (existe) {
        return errorResponse(res, 'La categoría ya existe', 400);
      }
    }

    await categoria.update({
      nombre: nombre ? nombre.toUpperCase() : categoria.nombre,
      descripcion: descripcion !== undefined ? descripcion : categoria.descripcion,
      fotoUrl: fotoUrl !== undefined ? fotoUrl : categoria.fotoUrl,
      estado: estado !== undefined ? estado : categoria.estado
    });

    return successResponse(res, categoria, 'Categoría actualizada exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    const productos = await Producto.count({ where: { categoriaId: id } });
    if (productos > 0) {
      return errorResponse(res, 'No se puede eliminar la categoría porque tiene productos asociados', 400);
    }

    await categoria.destroy();

    return successResponse(res, null, 'Categoría eliminada exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const categoria = await Categoria.findByPk(id);
    if (!categoria) {
      return errorResponse(res, 'Categoría no encontrada', 404);
    }

    await categoria.update({ estado });

    return successResponse(res, categoria, 'Estado actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.exportar = async (req, res) => {
  try {
    const categorias = await Categoria.findAll({ order: [['nombre', 'ASC']] });
    return successResponse(res, categorias);
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