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

// Usa jest.mock para reemplazar las implementaciones reales de los módulos con versiones simuladas.
// Mockea el modelo 'ClothingItem' de Mongoose. Esto intercepta las interacciones con la colección de prendas.
jest.mock('../models/clothing.model.js');
// Mockea el modelo 'User' de Mongoose, ya que el controlador interactúa con él para vincular prendas a usuarios.
jest.mock('../models/user.model.js');

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
    // Inicializa el objeto 'req' (request) con propiedades que simulan una petición HTTP.
    req = {
      body: {}, // Simula el cuerpo de la petición HTTP, donde van los datos.
      params: {}, // Simula los parámetros de la URL (e.g., /api/clothing/:id).
      // Simula que el middleware 'protect' ya ha añadido un usuario autenticado al objeto 'req'.
      user: { userId }, 
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
  });

  // Inicia un sub-bloque de pruebas para la función 'createClothingItem'.
  describe('createClothingItem', () => {
    // Define una prueba: debería crear una nueva prenda exitosamente.
    it('should create a new item successfully', async () => {
      // Configura el 'body' de la petición con los datos necesarios para crear una nueva prenda.
      req.body = { name: 'Jeans', category: 'Pants', color: 'Blue' };
      // Simula la existencia de un objeto 'file' en la petición, como si se hubiera subido una imagen.
      req.file = { filename: 'image.jpg' };
      // Define el objeto de la nueva prenda simulada, incluyendo un '_id' y el 'owner' (userId).
      const newItem = { _id: clothingItemId, ...req.body, owner: userId, imageUrl: '/uploads/image.jpg' };
      // Simula que 'ClothingItem.create' resuelve con el objeto de la nueva prenda simulada.
      ClothingItem.create.mockResolvedValue(newItem);
      // Simula que 'User.findByIdAndUpdate' se ejecuta correctamente cuando se añade la nueva prenda al usuario.
      User.findByIdAndUpdate.mockResolvedValue({});

      // Llama a la función 'createClothingItem' del controlador.
      await createClothingItem(req, res);

      // Verifica que 'ClothingItem.create' fue llamado con los datos de la prenda, incluyendo el 'imageUrl' y el 'owner'.
      expect(ClothingItem.create).toHaveBeenCalledWith({
        name: 'Jeans', category: 'Pants', color: 'Blue', brand: undefined, imageUrl: '/uploads/image.jpg', owner: userId
      });
      // Verifica que 'User.findByIdAndUpdate' fue llamado para actualizar la lista de prendas del usuario,
      // utilizando el operador '$push' para añadir el '_id' de la nueva prenda.
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(userId, { $push: { clothingItems: clothingItemId } });
      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 201 (Created).
      expect(res.status).toHaveBeenCalledWith(201);
      // Verifica que el método 'json' de la respuesta fue llamado con el objeto de la nueva prenda simulada.
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
  });

  // Inicia un sub-bloque de pruebas para la función 'updateClothingItem'.
  describe('updateClothingItem', () => {
    // Define una prueba: debería actualizar una prenda existente exitosamente.
    it('should update an item successfully', async () => {
      // Configura el 'id' de la prenda en los parámetros de la petición.
      req.params.id = clothingItemId;
      // Configura el 'body' de la petición con los campos a actualizar.
      req.body = { name: 'Updated T-Shirt' };
      // Define un objeto 'item' simulado que representa la prenda antes de la actualización.
      const item = { _id: clothingItemId, owner: userId, name: 'Old T-Shirt' };
      // Define cómo se vería el objeto 'item' después de la actualización.
      const updatedItem = { ...item, ...req.body };

      // Simula que 'ClothingItem.findById' resuelve con el objeto 'item' simulado.
      ClothingItem.findById.mockResolvedValue(item);
      // Simula que 'ClothingItem.findByIdAndUpdate' resuelve con el objeto 'updatedItem' simulado.
      ClothingItem.findByIdAndUpdate.mockResolvedValue(updatedItem);

      // Llama a la función 'updateClothingItem' del controlador.
      await updateClothingItem(req, res);

      // Verifica que 'ClothingItem.findById' fue llamado con el 'clothingItemId' para encontrar la prenda.
      expect(ClothingItem.findById).toHaveBeenCalledWith(clothingItemId);
      // Verifica que 'ClothingItem.findByIdAndUpdate' fue llamado con el 'clothingItemId',
      // los datos a actualizar y la opción '{ new: true }' para devolver la versión actualizada.
      expect(ClothingItem.findByIdAndUpdate).toHaveBeenCalledWith(
        clothingItemId,
        { name: 'Updated T-Shirt', category: undefined, color: undefined, brand: undefined },
        { new: true }
      );
      // Verifica que el método 'json' de la respuesta fue llamado con el objeto 'updatedItem' simulado.
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
  });

  // Inicia un sub-bloque de pruebas para la función 'deleteClothingItem'.
  describe('deleteClothingItem', () => {
    // Define una prueba: debería eliminar una prenda exitosamente.
    it('should delete an item successfully', async () => {
      // Configura el 'id' de la prenda en los parámetros de la petición.
      req.params.id = clothingItemId;
      // Define un objeto 'item' simulado que representa la prenda a eliminar.
      const item = { _id: clothingItemId, owner: userId };

      // Simula que 'ClothingItem.findById' resuelve con el objeto 'item' simulado.
      ClothingItem.findById.mockResolvedValue(item);
      // Simula que 'ClothingItem.findByIdAndDelete' resuelve exitosamente (devuelve un objeto vacío).
      ClothingItem.findByIdAndDelete.mockResolvedValue({});
      // Simula que 'User.updateOne' se ejecuta correctamente para eliminar la referencia de la prenda del usuario.
      User.updateOne.mockResolvedValue({});

      // Llama a la función 'deleteClothingItem' del controlador.
      await deleteClothingItem(req, res);

      // Verifica que 'ClothingItem.findById' fue llamado con el 'clothingItemId' para buscar la prenda.
      expect(ClothingItem.findById).toHaveBeenCalledWith(clothingItemId);
      // Verifica que 'ClothingItem.findByIdAndDelete' fue llamado con el 'clothingItemId' para eliminar la prenda.
      expect(ClothingItem.findByIdAndDelete).toHaveBeenCalledWith(clothingItemId);
      // Verifica que 'User.updateOne' fue llamado para actualizar la lista de prendas del usuario,
      // utilizando el operador '$pull' para remover el 'clothingItemId' del array 'clothingItems'.
      expect(User.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        { $pull: { clothingItems: clothingItemId } }
      );
      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 204 (No Content).
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
  });
});
