// CAMBIO 1: Importar los modelos de Mongoose en lugar del cliente de Prisma.
import ClothingItem from '../models/clothing.model.js';
import User from '../models/user.model.js';
// Importa la configuración de Cloudinary para la subida de imágenes.
import cloudinary from '../config/cloudinary.js';

// @desc    Get all clothing items for a user
// @route   GET /api/clothing
// @access  Private
export const getClothingItems = async (req, res) => {
  console.log('[CLOTHING] Petición para obtener prendas del usuario:', req.user.userId);
  try {
    // CAMBIO 2: Usar ClothingItem.find y filtrar por el campo 'owner'.
    const clothingItems = await ClothingItem.find({ owner: req.user.userId });
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
            { resource_type: 'image' },
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
          { resource_type: 'image' },
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
