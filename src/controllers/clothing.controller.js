// CAMBIO 1: Importar los modelos de Mongoose en lugar del cliente de Prisma.
import ClothingItem from '../models/clothing.model.js';
import User from '../models/user.model.js';

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
  if (req.file) {
    console.log('[CLOTHING] Imagen recibida:', req.file.path);
  }
  const { name, category, color, brand } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !category || !color) {
    console.log('[CLOTHING] Faltan datos obligatorios.');
    return res.status(400).json({ message: 'Name, category, and color are required' });
  }

  try {
    // CAMBIO 3: Usar ClothingItem.create y establecer 'owner' en lugar de 'ownerId'.
    const newItem = await ClothingItem.create({
      name, category, color, brand, imageUrl,
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
  if (req.file) {
    console.log('[CLOTHING] Imagen nueva recibida:', req.file.path);
  }
  const { id } = req.params;
  const { name, category, color, brand } = req.body;

  const dataToUpdate = { name, category, color, brand };

  if (req.file) {
    dataToUpdate.imageUrl = `/uploads/${req.file.filename}`;
  }


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
