const { Producto, Categoria, Marca, Usuario, Proveedor, Catalogo } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { Op } = require('sequelize');

// Listar productos activos (catálogo público - productos sin proveedor o todos si es ADMIN)
exports.listarProductos = async (req, res) => {
  try {
    const { categoria, marca, search, limit = 50, page = 1 } = req.query;
    const where = { estado: true };

    // Si es ADMIN o ADMINISTRADOR, mostrar todos los productos activos
    // Si no es ADMIN/ADMINISTRADOR, solo productos sin proveedor (de la tienda)
    if (req.user?.rol !== 'ADMIN' && req.user?.rol !== 'ADMINISTRADOR') {
      where.proveedorId = null;
    }

    if (categoria) where.categoriaId = categoria;
    if (marca) where.marcaId = marca;
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { descripcion: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: productos, count: total } = await Producto.findAndCountAll({
      where,
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Marca, as: 'marca', attributes: ['id', 'nombre'] }
      ],
      attributes: ['id', 'nombre', 'descripcion', 'precio', 'imagen', 'stock'],
      limit: parseInt(limit),
      offset,
      order: [['nombre', 'ASC']]
    });

    return successResponse(res, {
      productos,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error en listarProductos:', error);
    return errorResponse(res, error.message);
  }
};

// Ver detalle de producto
exports.verProducto = async (req, res) => {
  try {
    const producto = await Producto.findOne({
      where: { id: req.params.id, estado: true },
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Marca, as: 'marca', attributes: ['id', 'nombre'] }
      ]
    });

    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    return successResponse(res, producto);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Listar categorías con productos
exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.findAll({
      where: { estado: true },
      order: [['nombre', 'ASC']]
    });

    const categoriasConConteo = await Promise.all(
      categorias.map(async (cat) => {
        const count = await Producto.count({ where: { categoriaId: cat.id, estado: true } });
        return {
          id: cat.id,
          nombre: cat.nombre,
          descripcion: cat.descripcion,
          imagen: cat.fotoUrl,
          totalProductos: count
        };
      })
    );

    return successResponse(res, categoriasConConteo);
  } catch (error) {
    console.error('Error en listarCategorias:', error);
    return errorResponse(res, error.message);
  }
};

// Listar marcas destacadas
exports.listarMarcas = async (req, res) => {
  try {
    const marcas = await Marca.findAll({
      where: { estado: true },
      order: [['nombre', 'ASC']]
    });

    const marcasConConteo = await Promise.all(
      marcas.map(async (marca) => {
        const count = await Producto.count({ where: { marcaId: marca.id, estado: true } });
        return {
          id: marca.id,
          nombre: marca.nombre,
          imagen: marca.logo,
          totalProductos: count
        };
      })
    );

    const marcasConProductos = marcasConConteo.filter(m => m.totalProductos > 0);

    return successResponse(res, marcasConProductos);
  } catch (error) {
    console.error('Error en listarMarcas:', error);
    return errorResponse(res, error.message);
  }
};

// ================== CATÁLOGO DEL PROVEEDOR ==================

// Listar mis productos (solo para proveedores)
exports.listarMisProductos = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.documento);

    if (!usuario || !usuario.proveedorId) {
      return errorResponse(res, 'No tienes un proveedor asociado', 403);
    }

    const productos = await Producto.findAll({
      where: { proveedorId: usuario.proveedorId },
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Marca, as: 'marca', attributes: ['id', 'nombre'] }
      ],
      order: [['nombre', 'ASC']]
    });

    return successResponse(res, productos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Crear producto en el catálogo del proveedor
exports.crearProducto = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.documento);

    // ADMIN/ADMINISTRADOR puede crear sin proveedor, PROVEEDOR necesita tener proveedor asociado
    if (req.user.rol !== 'ADMIN' && req.user.rol !== 'ADMINISTRADOR' && (!usuario.proveedorId)) {
      return errorResponse(res, 'No tienes un proveedor asociado', 403);
    }

    const productoData = {
      ...req.body,
      proveedorId: req.user.rol === 'ADMIN' ? req.body.proveedorId : usuario.proveedorId
    };

    const nuevoProducto = await Producto.create(productoData);

    return successResponse(res, nuevoProducto, 'Producto creado en catálogo', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Actualizar producto del proveedor
exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(req.user.documento);

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    // ADMIN/ADMINISTRADOR puede editar cualquier producto, PROVEEDOR solo los suyos
    if (req.user.rol !== 'ADMIN' && req.user.rol !== 'ADMINISTRADOR') {
      if (!usuario.proveedorId || producto.proveedorId !== usuario.proveedorId) {
        return errorResponse(res, 'No tienes permiso para editar este producto', 403);
      }
    }

    await producto.update(req.body);
    return successResponse(res, producto, 'Producto actualizado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Eliminar producto del proveedor
exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }

    // Solo ADMIN/ADMINISTRADOR puede eliminar
    if (req.user.rol !== 'ADMIN' && req.user.rol !== 'ADMINISTRADOR') {
      return errorResponse(res, 'No tienes permiso para eliminar productos', 403);
    }

    await producto.destroy();
    return successResponse(res, null, 'Producto eliminado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// ================== NUEVO CATÁLOGO (Tabla separada) ==================

// Listar catálogo (con filtros por proveedor)
exports.listar = async (req, res) => {
  try {
    const { proveedorId } = req.query;
    const where = {};

    // Si es PROVEEDOR, solo puede ver su propio catálogo
    if (req.user.rol === 'PROVEEDOR') {
      const usuario = await Usuario.findByPk(req.user.documento);
      if (!usuario?.proveedorId) {
        return errorResponse(res, 'Proveedor no vinculado', 403);
      }
      where.proveedorId = usuario.proveedorId;
    } else if (proveedorId) {
      where.proveedorId = proveedorId;
    }

    const items = await Catalogo.findAll({
      where,
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre', 'nit'] }
      ],
      order: [['nombre', 'ASC']]
    });

    return successResponse(res, items);
  } catch (error) {
    console.error('Error en listar catálogo:', error);
    return errorResponse(res, error.message);
  }
};

// Ver detalle de ítem del catálogo
exports.ver = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Catalogo.findByPk(id, {
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre', 'nit'] }
      ]
    });

    if (!item) {
      return errorResponse(res, 'Ítem no encontrado', 404);
    }

    return successResponse(res, item);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Crear ítem en el catálogo
exports.crear = async (req, res) => {
  try {
    const { proveedorId, nombre, descripcion, precioSugerido, imagen, categoriaNombre, marcaNombre, estadoStock } = req.body;

    if (!nombre) {
      return errorResponse(res, 'El nombre es requerido', 400);
    }

    // Determinar el proveedorId
    let provId = proveedorId;
    if (req.user.rol === 'PROVEEDOR') {
      const usuario = await Usuario.findByPk(req.user.documento);
      if (!usuario?.proveedorId) {
        return errorResponse(res, 'Proveedor no vinculado', 403);
      }
      provId = usuario.proveedorId;
    }

    if (!provId) {
      return errorResponse(res, 'El proveedor es requerido', 400);
    }

    const nuevoItem = await Catalogo.create({
      proveedorId: provId,
      nombre,
      descripcion,
      precioSugerido: precioSugerido || 0,
      imagen,
      categoriaNombre,
      marcaNombre,
      estadoStock: estadoStock || 'Disponible'
    });

    return successResponse(res, nuevoItem, 'Ítem creado en catálogo', 201);
  } catch (error) {
    console.error('Error en crear catálogo:', error);
    return errorResponse(res, error.message);
  }
};

// Actualizar ítem del catálogo
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precioSugerido, imagen, categoriaNombre, marcaNombre, estadoStock } = req.body;

    const item = await Catalogo.findByPk(id);
    if (!item) {
      return errorResponse(res, 'Ítem no encontrado', 404);
    }

    // Verificar permisos
    if (req.user.rol === 'PROVEEDOR') {
      const usuario = await Usuario.findByPk(req.user.documento);
      if (!usuario?.proveedorId || item.proveedorId !== usuario.proveedorId) {
        return errorResponse(res, 'No tienes permiso para editar este ítem', 403);
      }
    }

    await item.update({
      nombre: nombre || item.nombre,
      descripcion: descripcion !== undefined ? descripcion : item.descripcion,
      precioSugerido: precioSugerido !== undefined ? precioSugerido : item.precioSugerido,
      imagen: imagen !== undefined ? imagen : item.imagen,
      categoriaNombre: categoriaNombre !== undefined ? categoriaNombre : item.categoriaNombre,
      marcaNombre: marcaNombre !== undefined ? marcaNombre : item.marcaNombre,
      estadoStock: estadoStock || item.estadoStock
    });

    return successResponse(res, item, 'Ítem actualizado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Eliminar ítem del catálogo
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Catalogo.findByPk(id);
    if (!item) {
      return errorResponse(res, 'Ítem no encontrado', 404);
    }

    // Solo ADMIN/ADMINISTRADOR puede eliminar
    if (req.user.rol !== 'ADMIN' && req.user.rol !== 'ADMINISTRADOR') {
      return errorResponse(res, 'No tienes permiso para eliminar ítems', 403);
    }

    await item.destroy();
    return successResponse(res, null, 'Ítem eliminado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};