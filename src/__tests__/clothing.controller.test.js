// Importa las funciones del controlador de prendas de vestir que se van a probar.
import {
  getClothingItems,
  createClothingItem,
  updateClothingItem,
  deleteClothingItem,
} from '../controllers/clothing.controller.js';
// Importa los modelos 'ClothingItem' y 'User' de Mongoose que utiliza el controlador.
import ClothingItem from '../models/clothing.model.js';
import User from '../models/user.model.js';
// Importa el módulo 'cloudinary' para poder referenciarlo en las pruebas.
import cloudinary from '../config/cloudinary.js';

// Usa jest.mock para reemplazar las implementaciones reales de los módulos con versiones simuladas.
// Mockea el modelo 'ClothingItem' de Mongoose. Esto intercepta las interacciones con la colección de prendas.
jest.mock('../models/clothing.model.js');
// Mockea el modelo 'User' de Mongoose, ya que el controlador interactúa con él para vincular prendas a usuarios.
jest.mock('../models/user.model.js');
// Mockea el módulo de Cloudinary para evitar llamadas reales a la API durante las pruebas.
jest.mock('../config/cloudinary.js', () => ({
  uploader: {
    upload_stream: jest.fn((options, callback) => {
      // Llama al callback con un resultado simulado de Cloudinary, incluyendo un public_id.
      callback(null, { secure_url: 'http://mock.cloudinary.com/image.jpg', public_id: 'mock_public_id' });
      // Devuelve un stream simulado con un método 'end' que no hace nada.
      return { end: jest.fn() };
    }),
    destroy: jest.fn(),
  },
}));

// Describe un bloque de pruebas para el "Clothing Controller".
describe('Clothing Controller', () => {
  // Declara variables para los objetos de solicitud (request) y respuesta (response) de Express.
  let req, res;
  // Define un ID de usuario simulado que será utilizado en las pruebas para simular autenticación.
  const userId = 'mockUserId'; 
  // Define un ID de prenda simulado.
  const clothingItemId = 'mockClothingItemId';

  // Se ejecuta antes de cada prueba individual dentro de este bloque 'describe'.
  beforeEach(() => {
    // Limpia el estado de todos los mocks, restableciendo sus contadores de llamadas y valores simulados.
    jest.clearAllMocks();
    // Mockea ClothingItem.schema para que el controlador pueda leer los enumValues
    // sin depender de la instancia real de Mongoose (que no existe en tests).
    ClothingItem.schema = {
      path: jest.fn().mockReturnValue({
        enumValues: ['SHIRT', 'PANTS', 'SHOES', 'JACKET', 'ACCESSORY', 'OTHER'],
      }),
    };
    // Inicializa el objeto 'req' (request) con propiedades que simulan una petición HTTP.
    req = {
      body: {}, // Simula el cuerpo de la petición HTTP, donde van los datos.
      params: {}, // Simula los parámetros de la URL (e.g., /api/clothing/:id).
      // Simula que el middleware 'protect' ya ha añadido un usuario autenticado al objeto 'req'.
      user: { userId },
      query: {}, // Simula los query params de la URL (e.g., ?category=SHIRT). Requerido por getClothingItems.
      file: undefined, // Simula el objeto de archivo subido por un middleware como Multer.
    };
    // Inicializa el objeto 'res' (response) con funciones simuladas de Jest para capturar las respuestas.
    res = {
      // Mockea el método 'status' de la respuesta. 'mockReturnThis()' permite encadenar métodos.
      status: jest.fn().mockReturnThis(),
      // Mockea la función 'json' de la respuesta, utilizada para enviar respuestas en formato JSON.
      json: jest.fn(),
      // Mockea la función 'send' de la respuesta, utilizada para enviar respuestas sin cuerpo (e.g., 204 No Content).
      send: jest.fn(),
    };
  });

  // Inicia un sub-bloque de pruebas para la función 'getClothingItems'.
  describe('getClothingItems', () => {
    // Define una prueba: debería devolver todas las prendas de vestir para un usuario autenticado.
    it('should return all clothing items for a user', async () => {
      // Define un array de objetos simulados que representan prendas de vestir.
      const items = [{ _id: clothingItemId, name: 'T-Shirt', owner: userId }];
      // Simula que la función 'find' del modelo 'ClothingItem' resuelve con el array de prendas simuladas.
      ClothingItem.find.mockResolvedValue(items);

      // Llama a la función 'getClothingItems' del controlador con los objetos 'req' y 'res' simulados.
      await getClothingItems(req, res);

      // Verifica que 'ClothingItem.find' fue llamado con un filtro que busca prendas cuyo 'owner' es el 'userId' simulado.
      expect(ClothingItem.find).toHaveBeenCalledWith({ owner: userId });
      // Verifica que el método 'json' de la respuesta fue llamado con el array de prendas simuladas.
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it('should handle errors when fetching items', async () => {
      const error = new Error('Database error');
      ClothingItem.find.mockRejectedValue(error);

      await getClothingItems(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });

    it('should filter by text search field (name)', async () => {
      req.query = { name: 'shirt' };
      const mockItems = [{ _id: '1', name: 'T-Shirt', owner: userId }];
      ClothingItem.find.mockResolvedValue(mockItems);

      await getClothingItems(req, res);

      expect(ClothingItem.find).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: userId,
          name: { $regex: 'shirt', $options: 'i' }
        })
      );
      expect(res.json).toHaveBeenCalledWith(mockItems);
    });

    it('should filter by exact match field (color)', async () => {
      req.query = { color: 'Blue' };
      const mockItems = [{ _id: '1', color: 'Blue', owner: userId }];
      ClothingItem.find.mockResolvedValue(mockItems);

      await getClothingItems(req, res);

      expect(ClothingItem.find).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: userId,
          color: 'Blue'
        })
      );
      expect(res.json).toHaveBeenCalledWith(mockItems);
    });

    it('should filter by valid category (normalized to uppercase)', async () => {
      req.query = { category: 'shirt' };
      const mockItems = [{ _id: '1', category: 'SHIRT', owner: userId }];
      ClothingItem.find.mockResolvedValue(mockItems);

      await getClothingItems(req, res);

      expect(ClothingItem.find).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: userId,
          category: 'SHIRT'
        })
      );
      expect(res.json).toHaveBeenCalledWith(mockItems);
    });

    it('should ignore invalid category filter', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      req.query = { category: 'invalid_category' };
      const mockItems = [{ _id: '1', owner: userId }];
      ClothingItem.find.mockResolvedValue(mockItems);

      await getClothingItems(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid category filter value ignored')
      );
      expect(ClothingItem.find).toHaveBeenCalledWith({ owner: userId });
      expect(res.json).toHaveBeenCalledWith(mockItems);

      consoleLogSpy.mockRestore();
    });
  });

  // Inicia un sub-bloque de pruebas para la función 'createClothingItem'.
  describe('createClothingItem', () => {
    // Define una prueba: debería crear una nueva prenda con una imagen subida a Cloudinary.
    it('should create a new item with an image uploaded to Cloudinary', async () => {
      // Configura el 'body' de la petición.
      req.body = { name: 'Jeans', category: 'Pants', color: 'Blue' };
      // Simula un archivo subido con un buffer de datos.
      req.file = { buffer: Buffer.from('mockImageData') };
      // Define el objeto de la nueva prenda con la URL simulada de Cloudinary y el Public ID.
      const newItem = {
        _id: clothingItemId,
        ...req.body,
        owner: userId,
        imageUrl: 'http://mock.cloudinary.com/image.jpg',
        imagePublicId: 'mock_public_id'
      };

      // Simula la creación exitosa del ítem en la base de datos.
      ClothingItem.create.mockResolvedValue(newItem);
      // Simula la actualización exitosa del usuario.
      User.findByIdAndUpdate.mockResolvedValue({});

      // Llama a la función del controlador.
      await createClothingItem(req, res);

      // Verifica que el stream de subida de Cloudinary fue llamado.
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();
      // Verifica que 'ClothingItem.create' fue llamado con los datos correctos, incluyendo la URL de Cloudinary y el Public ID.
      expect(ClothingItem.create).toHaveBeenCalledWith({
        name: 'Jeans', category: 'Pants', color: 'Blue', brand: undefined, 
        imageUrl: 'http://mock.cloudinary.com/image.jpg', 
        imagePublicId: 'mock_public_id', // Afirma el Public ID
        owner: userId
      });
      // Verifica que el usuario fue actualizado con el nuevo ítem.
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, { $push: { clothingItems: clothingItemId } });
      // Verifica la respuesta HTTP.
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newItem);
    });

    // Define una prueba: debería crear una nueva prenda sin imagen.
    it('should create a new item without an image', async () => {
      // Configura el 'body' de la petición.
      req.body = { name: 'Socks', category: 'Accessories', color: 'White' };
      // La petición no incluye un archivo (req.file es undefined).
      const newItem = { _id: clothingItemId, ...req.body, owner: userId, imageUrl: null, imagePublicId: null }; // imagePublicId también es null

      // Simula la creación exitosa en la base de datos.
      ClothingItem.create.mockResolvedValue(newItem);
      User.findByIdAndUpdate.mockResolvedValue({});

      // Llama a la función del controlador.
      await createClothingItem(req, res);

      // Verifica que el stream de subida de Cloudinary NO fue llamado.
      expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
      // Verifica que 'ClothingItem.create' fue llamado con 'imageUrl' como null.
      expect(ClothingItem.create).toHaveBeenCalledWith({
        name: 'Socks', category: 'Accessories', color: 'White', brand: undefined, imageUrl: null, imagePublicId: null, owner: userId
      });
      // Verifica la respuesta HTTP.
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newItem);
    });

    // Define una prueba: debería devolver un error 400 si faltan campos obligatorios en la creación de la prenda.
    it('should return 400 if required fields are missing', async () => {
      // Configura el 'body' de la petición con datos incompletos (faltan 'category' y 'color').
      req.body = { name: 'Incomplete' };

      // Llama a la función 'createClothingItem' del controlador.
      await createClothingItem(req, res);

      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 400 (Bad Request).
      expect(res.status).toHaveBeenCalledWith(400);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de error esperado.
      expect(res.json).toHaveBeenCalledWith({ message: 'Name, category, and color are required' });
    });

    it('should handle database errors during item creation', async () => {
      req.body = { name: 'Jeans', category: 'Pants', color: 'Blue' };
      const error = new Error('Database error');
      ClothingItem.create.mockRejectedValue(error);

      await createClothingItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  // Inicia un sub-bloque de pruebas para la función 'updateClothingItem'.
  describe('updateClothingItem', () => {
    // Define una prueba: debería actualizar los datos de una prenda sin cambiar la imagen.
    it('should update an item data successfully without changing the image', async () => {
      req.params.id = clothingItemId;
      req.body = { name: 'Updated T-Shirt' };
      // Simula un ítem existente con una imageUrl y un imagePublicId.
      const item = { 
        _id: clothingItemId, 
        owner: userId, 
        name: 'Old T-Shirt', 
        imageUrl: 'http://existing-image.com/image.jpg',
        imagePublicId: 'existing_public_id' 
      };
      const updatedItem = { ...item, ...req.body };

      ClothingItem.findById.mockResolvedValue(item);
      ClothingItem.findByIdAndUpdate.mockResolvedValue(updatedItem);

      await updateClothingItem(req, res);

      // Verifica que el stream de subida de Cloudinary y el método destroy NO fueron llamados.
      expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
      expect(ClothingItem.findById).toHaveBeenCalledWith(clothingItemId);
      expect(ClothingItem.findByIdAndUpdate).toHaveBeenCalledWith(
        clothingItemId,
        { name: 'Updated T-Shirt', category: undefined, color: undefined, brand: undefined },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedItem);
    });

    // Define una prueba: debería actualizar una prenda y subir una nueva imagen a Cloudinary.
    it('should update an item and upload a new image to Cloudinary', async () => {
      req.params.id = clothingItemId;
      req.body = { name: 'Updated Jeans' };
      // Simula un nuevo archivo de imagen subido.
      req.file = { buffer: Buffer.from('newMockImageData') };
      // Simula un ítem existente con una imageUrl y un imagePublicId (que será eliminado).
      const item = { 
        _id: clothingItemId, 
        owner: userId, 
        name: 'Old Jeans', 
        imageUrl: 'http://old.cloudinary.com/old_image.jpg',
        imagePublicId: 'old_public_id' 
      };
      // El 'updatedItem' debe contener la nueva URL de Cloudinary y el nuevo Public ID.
      const updatedItem = { 
        ...item, 
        ...req.body, 
        imageUrl: 'http://mock.cloudinary.com/image.jpg',
        imagePublicId: 'mock_public_id' 
      };
      
      ClothingItem.findById.mockResolvedValue(item);
      ClothingItem.findByIdAndUpdate.mockResolvedValue(updatedItem);

      await updateClothingItem(req, res);

      // Verifica que el stream de subida de Cloudinary fue llamado.
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalled();
      // Verifica que la imagen antigua fue eliminada de Cloudinary.
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('old_public_id');
      expect(ClothingItem.findById).toHaveBeenCalledWith(clothingItemId);
      expect(ClothingItem.findByIdAndUpdate).toHaveBeenCalledWith(
        clothingItemId,
        { name: 'Updated Jeans', category: undefined, color: undefined, brand: undefined, imageUrl: 'http://mock.cloudinary.com/image.jpg', imagePublicId: 'mock_public_id' },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updatedItem);
    });

    // Define una prueba: debería devolver un error 403 si el usuario no es el propietario de la prenda.
    it('should return 403 if user is not the owner', async () => {
      // Configura el 'id' de la prenda en los parámetros de la petición.
      req.params.id = clothingItemId;
      // Define un objeto 'item' simulado donde el 'owner' es un ID diferente al 'userId' autenticado.
      const item = { _id: clothingItemId, owner: 'anotherUserId' };

      // Simula que 'ClothingItem.findById' resuelve con el objeto 'item' simulado.
      ClothingItem.findById.mockResolvedValue(item);

      // Llama a la función 'updateClothingItem' del controlador.
      await updateClothingItem(req, res);

      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 403 (Forbidden).
      expect(res.status).toHaveBeenCalledWith(403);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de error esperado.
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authorized to update this item' });
    });

    // Define una prueba: debería devolver un error 404 si no se encuentra la prenda a actualizar.
    it('should return 404 if item not found', async () => {
      // Configura el 'id' de la prenda en los parámetros de la petición con un ID que no existe.
      req.params.id = 'nonExistentId';
      // Simula que 'ClothingItem.findById' resuelve con 'null', indicando que la prenda no fue encontrada.
      ClothingItem.findById.mockResolvedValue(null);

      // Llama a la función 'updateClothingItem' del controlador.
      await updateClothingItem(req, res);

      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 404 (Not Found).
      expect(res.status).toHaveBeenCalledWith(404);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de error esperado.
      expect(res.json).toHaveBeenCalledWith({ message: 'Clothing item not found' });
    });

    it('should handle database errors during update', async () => {
      req.params.id = clothingItemId;
      req.body = { name: 'Updated' };
      const error = new Error('Database error');
      ClothingItem.findById.mockRejectedValue(error);

      await updateClothingItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  // Inicia un sub-bloque de pruebas para la función 'deleteClothingItem'.
  describe('deleteClothingItem', () => {
    // Define una prueba: debería eliminar una prenda con una imagen de Cloudinary.
    it('should delete an item and its image from Cloudinary', async () => {
      req.params.id = clothingItemId;
      // Simula un ítem con una URL de imagen de Cloudinary y un Public ID.
      const item = { _id: clothingItemId, owner: userId, imageUrl: 'http://mock.cloudinary.com/image.jpg', imagePublicId: 'mock_public_id' };

      ClothingItem.findById.mockResolvedValue(item);
      ClothingItem.findByIdAndDelete.mockResolvedValue({});
      User.updateOne.mockResolvedValue({});
      // Simula que la eliminación en Cloudinary es exitosa.
      cloudinary.uploader.destroy.mockResolvedValue({});

      await deleteClothingItem(req, res);

      expect(ClothingItem.findById).toHaveBeenCalledWith(clothingItemId);
      // Verifica que 'destroy' de Cloudinary es llamado con el Public ID almacenado.
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('mock_public_id');
      expect(ClothingItem.findByIdAndDelete).toHaveBeenCalledWith(clothingItemId);
      expect(User.updateOne).toHaveBeenCalledWith({ _id: userId }, { $pull: { clothingItems: clothingItemId } });
      expect(res.status).toHaveBeenCalledWith(204);
    });

    // Define una prueba: debería eliminar una prenda sin imagen.
    it('should delete an item without an image', async () => {
      req.params.id = clothingItemId;
      // Simula un ítem sin 'imageUrl' ni 'imagePublicId'.
      const item = { _id: clothingItemId, owner: userId, imageUrl: null, imagePublicId: null };

      ClothingItem.findById.mockResolvedValue(item);
      ClothingItem.findByIdAndDelete.mockResolvedValue({});
      User.updateOne.mockResolvedValue({});

      await deleteClothingItem(req, res);

      expect(ClothingItem.findById).toHaveBeenCalledWith(clothingItemId);
      // Verifica que 'destroy' de Cloudinary NO fue llamado.
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
      expect(ClothingItem.findByIdAndDelete).toHaveBeenCalledWith(clothingItemId);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    // Define una prueba: debería devolver un error 404 si no se encuentra la prenda a eliminar.
    it('should return 404 if item not found', async () => {
      // Configura el 'id' de la prenda en los parámetros de la petición con un ID que no existe.
      req.params.id = 'nonExistentId';
      // Simula que 'ClothingItem.findById' resuelve con 'null', indicando que la prenda no fue encontrada.
      ClothingItem.findById.mockResolvedValue(null);

      // Llama a la función 'deleteClothingItem' del controlador.
      await deleteClothingItem(req, res);

      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 404 (Not Found).
      expect(res.status).toHaveBeenCalledWith(404);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de error esperado.
      expect(res.json).toHaveBeenCalledWith({ message: 'Clothing item not found' });
    });

    // Define una prueba: debería devolver un error 403 si el usuario no es el propietario de la prenda a eliminar.
    it('should return 403 if user is not the owner', async () => {
      // Configura el 'id' de la prenda en los parámetros de la petición.
      req.params.id = clothingItemId;
      // Define un objeto 'item' simulado donde el 'owner' es un ID diferente al 'userId' autenticado.
      const item = { _id: clothingItemId, owner: 'anotherUserId' };

      // Simula que 'ClothingItem.findById' resuelve con el objeto 'item' simulado.
      ClothingItem.findById.mockResolvedValue(item);

      // Llama a la función 'deleteClothingItem' del controlador.
      await deleteClothingItem(req, res);

      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 403 (Forbidden).
      expect(res.status).toHaveBeenCalledWith(403);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de error esperado.
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authorized to delete this item' });
    });

    it('should handle database errors during delete', async () => {
      req.params.id = clothingItemId;
      const error = new Error('Database error');
      ClothingItem.findById.mockRejectedValue(error);

      await deleteClothingItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });
});
