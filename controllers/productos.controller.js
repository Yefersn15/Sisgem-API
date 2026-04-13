const { Producto, Categoria, Marca } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.listar = async (req, res) => {
  try {
    const { categoria, marca, proveedor, estado, search } = req.query;
    const where = {};

    const isStaff = req.user && ['ADMIN', 'EMPLEADO'].includes(req.user.rol);
    if (req.user && !isStaff) {
      where.estado = true;
    } else if (estado !== undefined) {
      where.estado = estado === 'true';
    }

    if (categoria) where.categoriaId = categoria;
    if (marca) where.marcaId = marca;
    
    if (req.user && req.user.rol === 'PROVEEDOR' && req.user.proveedor) {
      where.proveedorId = req.user.proveedor;
    } else if (proveedor) {
      where.proveedorId = proveedor;
    }
    
    if (search) {
      where.nombre = { [require('sequelize').Op.iLike]: `%${search}%` };
    }

    const productos = await Producto.findAll({
      where,
      include: [
        { model: Categoria, attributes: ['id', 'nombre'], as: 'categoria' },
        { model: Marca, attributes: ['id', 'nombre'], as: 'marca' }
      ],
      order: [['createdAt', 'DESC']]
    });

    return successResponse(res, productos);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen, categoriaId, marcaId, proveedorId, estado, stockMinimo, precioCompra, codigoBarras } = req.body;

    if (categoriaId) {
      const categoria = await Categoria.findByPk(categoriaId);
      if (!categoria) {
        return errorResponse(res, 'Categoría no válida', 400);
      }
    }

    if (marcaId) {
      const marca = await Marca.findByPk(marcaId);
      if (!marca) {
        return errorResponse(res, 'Marca no válida', 400);
      }
    }

    let proveedorFinal = proveedorId;
    if (req.user && req.user.rol === 'PROVEEDOR') {
      if (!req.user.proveedor) {
        return errorResponse(res, 'No tiene un proveedor asignado. Contacte al administrador.', 403);
      }
      proveedorFinal = req.user.proveedor;
    }

    const nuevoProducto = await Producto.create({
      nombre,
      descripcion,
      precio,
      stock: stock || 0,
      imagen,
      categoriaId: categoriaId || 1,
      marcaId: marcaId || 1,
      proveedorId: proveedorFinal,
      estado: estado !== undefined ? estado : true,
      stockMinimo: stockMinimo || 0,
      precioCompra,
      codigoBarras
    });

    const productoCreado = await Producto.findByPk(nuevoProducto.id, {
      include: [
        { model: Categoria, attributes: ['nombre'], as: 'categoria' },
        { model: Marca, attributes: ['nombre'], as: 'marca' }
      ]
    });

    return successResponse(res, productoCreado, 'Producto creado exitosamente', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.verDetalle = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findByPk(id, {
      include: [
        { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        { model: Marca, as: 'marca', attributes: ['nombre'] }
      ]
    });

    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    return successResponse(res, producto);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, imagen, categoriaId, marcaId, proveedorId, estado, stockMinimo, precioCompra, codigoBarras } = req.body;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    await producto.update({
      nombre: nombre !== undefined ? nombre : producto.nombre,
      descripcion: descripcion !== undefined ? descripcion : producto.descripcion,
      precio: precio !== undefined ? precio : producto.precio,
      stock: stock !== undefined ? stock : producto.stock,
      imagen: imagen !== undefined ? imagen : producto.imagen,
      categoriaId: categoriaId !== undefined ? categoriaId : producto.categoriaId,
      marcaId: marcaId !== undefined ? marcaId : producto.marcaId,
      proveedorId: proveedorId !== undefined ? proveedorId : producto.proveedorId,
      estado: estado !== undefined ? estado : producto.estado,
      stockMinimo: stockMinimo !== undefined ? stockMinimo : producto.stockMinimo,
      precioCompra: precioCompra !== undefined ? precioCompra : producto.precioCompra,
      codigoBarras: codigoBarras !== undefined ? codigoBarras : producto.codigoBarras
    });

    const productoActualizado = await Producto.findByPk(id, {
      include: [
        { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        { model: Marca, as: 'marca', attributes: ['nombre'] }
      ]
    });

    return successResponse(res, productoActualizado, 'Producto actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    await producto.destroy();

    return successResponse(res, null, 'Producto eliminado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    await producto.update({ estado });

    return successResponse(res, producto, 'Estado actualizado exitosamente');
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.stockBajo = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const productos = await Producto.findAll({
      where: {
        estado: true,
        [Op.or]: [
          { stock: { [Op.lt]: 5 } }
        ]
      },
      include: [
        { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        { model: Marca, as: 'marca', attributes: ['nombre'] }
      ]
    });

    return successResponse(res, productos);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};

exports.exportar = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        { model: Marca, as: 'marca', attributes: ['nombre'] }
      ]
    });

    return successResponse(res, productos);
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
    const productos = await Producto.findAll({
      include: [
        { model: Categoria, as: 'categoria', attributes: ['nombre'] },
        { model: Marca, as: 'marca', attributes: ['nombre'] }
      ]
    });

    return successResponse(res, productos);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message);
  }
};