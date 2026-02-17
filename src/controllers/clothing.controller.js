// CAMBIO 1: Importar los modelos de Mongoose en lugar del cliente de Prisma.
import ClothingItem from '../models/clothing.model.js';
import User from '../models/user.model.js';
// Importa la configuración de Cloudinary para la subida de imágenes.
import cloudinary from '../config/cloudinary.js';

// @desc    Get all clothing items for a user, with filtering
// @route   GET /api/clothing
// @access  Private
export const getClothingItems = async (req, res) => {
  console.log('[CLOTHING] Petición para obtener prendas del usuario:', req.user.userId);
  try {
    const { query } = req; // Obtenemos los parámetros de consulta de la petición (ej. ?category=SHIRT)
    
    // Filtro base: siempre restringir por el propietario (dueño) de la prenda.
    const filters = { owner: req.user.userId };
    // Lista blanca de las claves de filtro permitidas. Esto previene NoSQL Injection y filtrado por campos no deseados.
    const allowedFilters = ['name', 'category', 'color', 'brand'];
    // Campos que permiten búsqueda parcial con regex (ej. buscar "cam" encuentra "camisa").
    const textSearchFields = ['name', 'brand'];
    // Valores válidos del enum para 'category' directamente del esquema del modelo.
    const categoryEnumValues = ClothingItem.schema.path('category').enumValues;

    // Valida que el valor recibido del query param sea un string no vacío.
    // Esto previene inyecciones donde el atacante envía objetos o arrays en lugar de strings.
    const isValidParam = (value) => typeof value === 'string' && value.length > 0;

    // Construye el valor del filtro de MongoDB según el tipo de campo.
    // Retorna null si el valor no es válido (ej. categoría inexistente).
    const buildFilterValue = (key, value) => {
      // Si el campo es de texto libre (name o brand), retorna un regex para búsqueda parcial e insensible a mayúsculas.
      if (textSearchFields.includes(key)) {
        return { $regex: value, $options: 'i' };
      }

      // Si el campo NO es 'category', retorna el valor tal cual para coincidencia exacta (ej. color).
      if (key !== 'category') {
        return value;
      }

      // Para 'category', normaliza a mayúsculas para comparar con el enum del esquema.
      const upperValue = value.toUpperCase();

      // Si el valor no existe en el enum, lo descarta y registra un aviso en consola.
      if (!categoryEnumValues.includes(upperValue)) {
        console.log(`[CLOTHING] Invalid category filter value ignored: ${value}`);
        return null;
      }

      // Retorna el valor válido de la categoría ya normalizado.
      return upperValue;
    };

    // Filtra solo los query params que están en la lista blanca y tienen un valor válido.
    const validKeys = allowedFilters.filter((key) => isValidParam(query[key]));

    // Transforma cada clave válida en un par [clave, valorFiltrado] para construir el objeto de filtros.
    const filterEntries = validKeys.map((key) => [key, buildFilterValue(key, query[key])]);

    // Elimina los pares donde el valor es null (ej. categoría inválida).
    const validEntries = filterEntries.filter(([, value]) => value !== null);

    // Convierte el array de pares [clave, valor] en un objeto y lo combina con el filtro base (owner).
    Object.assign(filters, Object.fromEntries(validEntries));
    
    console.log('[CLOTHING] Aplicando filtros:', filters);
    // Realizamos la búsqueda en la base de datos utilizando el objeto de filtros construido.
    const clothingItems = await ClothingItem.find(filters);
    console.log('[CLOTHING] Prendas encontradas:', clothingItems.length);
    res.json(clothingItems);
  } catch (error) {
    console.error('[CLOTHING] Error al obtener prendas:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Create a new clothing item
// @route   POST /api/clothing
// @access  Private
export const createClothingItem = async (req, res) => {
  console.log('[CLOTHING] Petición para crear prenda. Body:', req.body);
  
      const { name, category, color, brand } = req.body;
    let imageUrl = null;
    let imagePublicId = null; // Inicializa el nuevo campo para el ID público de Cloudinary
  
    if (!name || !category || !color) {
      console.log('[CLOTHING] Faltan datos obligatorios.');
      return res.status(400).json({ message: 'Name, category, and color are required' });
    }
  
    try {
      // Si se adjunta un archivo, súbelo a Cloudinary.
      if (req.file) {
        console.log('[CLOTHING] Imagen recibida, subiendo a Cloudinary...');
        
        // Sube el buffer de la imagen a Cloudinary.
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              background_removal: 'cloudinary_ai',
              transformation: [{ background: '#FFFFFF' }],
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });

        // Guarda la URL segura de la imagen subida y su ID público.
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id; // Guarda el public_id de Cloudinary
        console.log(`[CLOTHING] Imagen subida a Cloudinary: ${imageUrl}, Public ID: ${imagePublicId}`);
      }
  
      // CAMBIO 3: Usar ClothingItem.create y establecer 'owner' en lugar de 'ownerId'.
      // Incluye el imagePublicId en la creación del nuevo ítem.
      const newItem = await ClothingItem.create({
        name, category, color, brand, imageUrl, imagePublicId,
        owner: req.user.userId,
      });
    // CAMBIO 4: Añadir la referencia de la nueva prenda al array del usuario.
    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { clothingItems: newItem._id } }
    );

    console.log('[CLOTHING] Prenda creada:', newItem._id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('[CLOTHING] Error al crear prenda:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Update a clothing item
// @route   PUT /api/clothing/:id
// @access  Private
export const updateClothingItem = async (req, res) => {
  console.log('[CLOTHING] Petición para actualizar prenda. ID:', req.params.id, 'Body:', req.body);
  const { id } = req.params;
  const { name, category, color, brand } = req.body;

  const dataToUpdate = { name, category, color, brand };

  try {
    // CAMBIO 5: Encontrar la prenda por su ID con el método findById de Mongoose.
    const item = await ClothingItem.findById(id);

    if (!item) {
      return res.status(404).json({ message: 'Clothing item not found' });
    }

    // CAMBIO 6: Convertir el ObjectId del propietario a string para la comparación.
    if (item.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'User not authorized to update this item' });
    }

    // Si se adjunta un nuevo archivo, súbelo a Cloudinary.
    if (req.file) {
      console.log('[CLOTHING] Imagen nueva recibida, subiendo a Cloudinary...');
      
      // Si ya existía una imagen y un Public ID, elimínala de Cloudinary.
      if (item.imagePublicId) {
        console.log(`[CLOTHING] Eliminando imagen antigua de Cloudinary con public ID: ${item.imagePublicId}`);
        await cloudinary.uploader.destroy(item.imagePublicId);
      }

      // Sube el buffer de la nueva imagen a Cloudinary.
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            background_removal: 'cloudinary_ai',
            transformation: [{ background: '#FFFFFF' }],
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      // Actualiza la URL de la imagen con la nueva URL de Cloudinary y el Public ID.
      dataToUpdate.imageUrl = uploadResult.secure_url;
      dataToUpdate.imagePublicId = uploadResult.public_id; // Guarda el nuevo public_id
      console.log(`[CLOTHING] Nueva imagen subida a Cloudinary: ${dataToUpdate.imageUrl}, Public ID: ${dataToUpdate.imagePublicId}`);
    }


    // CAMBIO 7: Usar findByIdAndUpdate para actualizar y devolver la nueva versión.
    const updatedItem = await ClothingItem.findByIdAndUpdate(id, dataToUpdate, { new: true });

    res.json(updatedItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Delete a clothing item
// @route   DELETE /api/clothing/:id
// @access  Private
export const deleteClothingItem = async (req, res) => {
  const { id } = req.params;

  try {
    // CAMBIO 8: Encontrar la prenda por ID para verificar la propiedad antes de borrar.
    const item = await ClothingItem.findById(id);

    if (!item) {
      return res.status(404).json({ message: 'Clothing item not found' });
    }

    // CAMBIO 9: Convertir el ObjectId del propietario a string para la comparación.
    console.log('[CLOTHING] Debug delete - item.owner:', item.owner, 'req.user.userId:', req.user.userId);
    if (item.owner.toString() !== req.user.userId) {
      console.log('[CLOTHING] Autorización denegada - owner no coincide');
      return res.status(403).json({ message: 'User not authorized to delete this item' });
    }

    // Si la prenda tiene un Public ID de imagen en Cloudinary, elimínala.
    if (item.imagePublicId) {
      console.log(`[CLOTHING] Eliminando imagen de Cloudinary con public ID: ${item.imagePublicId}`);
      // Elimina la imagen de Cloudinary usando el Public ID almacenado.
      await cloudinary.uploader.destroy(item.imagePublicId);
    }

    // CAMBIO 10: Eliminar la prenda de la colección ClothingItem.
    await ClothingItem.findByIdAndDelete(id);

    // CAMBIO 11: Eliminar la referencia a la prenda del array clothingItems del usuario.
    await User.updateOne(
      { _id: req.user.userId },
      { $pull: { clothingItems: item._id } }
    );

    res.status(204).send(); // No content
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
