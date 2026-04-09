const Producto = require('../models/Producto');
const Categoria = require('../models/Categoria');
const Marca = require('../models/Marca');
const Usuario = require('../models/Usuario');
const { successResponse, errorResponse, isValidObjectId } = require('../utils/helpers');

// Listar productos activos (catálogo público - solo productos sin proveedor)
exports.listarProductos = async (req, res) => {
  try {
    const { categoria, marca, search, limit = 50, page = 1 } = req.query;
    const filtro = { estado: true, proveedor: null };  // Solo productos de la tienda (sin proveedor)
    
    if (categoria) filtro.categoria = categoria;
    if (marca) filtro.marca = marca;
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const productos = await Producto.find(filtro)
      .populate('categoria', 'nombre')
      .populate('marca', 'nombre')
      .select('nombre descripcion precio imagen categoria marca')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ nombre: 1 });
    
    const total = await Producto.countDocuments(filtro);
    
    return successResponse(res, {
      productos,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Ver detalle de producto
exports.verProducto = async (req, res) => {
  try {
    const producto = await Producto.findOne({
      _id: req.params.id,
      estado: true
    })
      .populate('categoria', 'nombre')
      .populate('marca', 'nombre')
      .populate('proveedor', 'nombre');
    
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
    const categorias = await Categoria.find({ estado: true }).sort({ nombre: 1 });
    
    const categoriasConConteo = await Promise.all(
      categorias.map(async (cat) => {
        const count = await Producto.countDocuments({ categoria: cat._id, estado: true });
        return {
          _id: cat._id,
          nombre: cat.nombre,
          descripcion: cat.descripcion,
          imagen: cat.imagen,
          totalProductos: count
        };
      })
    );
    
    return successResponse(res, categoriasConConteo);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Listar marcas destacadas
exports.listarMarcas = async (req, res) => {
  try {
    const marcas = await Marca.find({ estado: true }).sort({ nombre: 1 });
    
    const marcasConConteo = await Promise.all(
      marcas.map(async (marca) => {
        const count = await Producto.countDocuments({ marca: marca._id, estado: true });
        return {
          _id: marca._id,
          nombre: marca.nombre,
          imagen: marca.imagen,
          totalProductos: count
        };
      })
    );
    
    const marcasConProductos = marcasConConteo.filter(m => m.totalProductos > 0);
    
    return successResponse(res, marcasConProductos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// ================== CATÁLOGO DEL PROVEEDOR ==================

// Listar mis productos (solo para proveedores)
exports.listarMisProductos = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id);
    
    if (!usuario || !usuario.proveedor) {
      return errorResponse(res, 'No tienes un proveedor asociado', 403);
    }
    
    const productos = await Producto.find({ proveedor: usuario.proveedor })
      .populate('categoria', 'nombre')
      .populate('marca', 'nombre')
      .sort({ nombre: 1 });
    
    return successResponse(res, productos);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Crear producto en el catálogo del proveedor
exports.crearProducto = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id).populate('proveedor');
    
    // ADMIN puede crear sin proveedor, PROVEEDOR necesita tener proveedor asociado
    if (req.user.rol !== 'ADMIN' && (!usuario.proveedor)) {
      return errorResponse(res, 'No tienes un proveedor asociado', 403);
    }
    
    const productoData = {
      ...req.body,
      proveedor: req.user.rol === 'ADMIN' ? req.body.proveedor : usuario.proveedor._id
    };
    
    const nuevoProducto = new Producto(productoData);
    await nuevoProducto.save();
    
    return successResponse(res, nuevoProducto, 'Producto creado en catálogo', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Actualizar producto del proveedor
exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(req.user.id).populate('proveedor');
    
    const producto = await Producto.findById(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }
    
    // ADMIN puede editar cualquier producto, PROVEEDOR solo los suyos
    if (req.user.rol !== 'ADMIN') {
      if (!usuario.proveedor || String(producto.proveedor) !== String(usuario.proveedor._id)) {
        return errorResponse(res, 'No tienes permiso para editar este producto', 403);
      }
    }
    
    const productoActualizado = await Producto.findByIdAndUpdate(id, req.body, { new: true });
    return successResponse(res, productoActualizado, 'Producto actualizado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Eliminar producto del proveedor
exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const producto = await Producto.findById(id);
    if (!producto) {
      return errorResponse(res, 'Producto no encontrado', 404);
    }
    
    // Solo ADMIN puede eliminar
    if (req.user.rol !== 'ADMIN') {
      return errorResponse(res, 'No tienes permiso para eliminar productos', 403);
    }
    
    await Producto.findByIdAndDelete(id);
    return successResponse(res, null, 'Producto eliminado');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};
