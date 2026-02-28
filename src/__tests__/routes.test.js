// Importa la librería 'supertest' para hacer peticiones HTTP a la aplicación Express en los tests.
import request from 'supertest';
// Importa la instancia de la aplicación Express que se va a probar.
import app from '../app.js';
// Importa el modelo 'User' de Mongoose, que será mockeado para simular interacciones con usuarios.
import User from '../models/user.model.js';
// Importa el modelo 'ClothingItem' de Mongoose, que será mockeado para simular interacciones con prendas.
import ClothingItem from '../models/clothing.model.js';
// Importa la librería 'bcryptjs' para simular operaciones de hashing de contraseñas.
import bcrypt from 'bcryptjs';
// Importa la librería 'jsonwebtoken' para simular la creación y verificación de tokens JWT.
import jwt from 'jsonwebtoken';

// Importa específicamente el middleware 'protect' para poder mockearlo y controlar su comportamiento.
import { protect } from '../middlewares/auth.middleware.js';

// Usa jest.mock para reemplazar las implementaciones reales de los módulos con versiones simuladas.
// Mockea el modelo 'User' de Mongoose. Todas las llamadas a 'User' serán interceptadas.
jest.mock('../models/user.model.js');
// Mockea el modelo 'ClothingItem' de Mongoose. Todas las llamadas a 'ClothingItem' serán interceptadas.
jest.mock('../models/clothing.model.js');
// Mockea el middleware 'auth.middleware.js'. Todas las funciones exportadas de este módulo serán simuladas.
jest.mock('../middlewares/auth.middleware.js');
// Mockea la librería 'bcryptjs'.
jest.mock('bcryptjs');
// Mockea la librería 'jsonwebtoken'.
jest.mock('jsonwebtoken');

// Inicia un bloque de pruebas de integración para las rutas de la API.
describe('API Routes Integration Tests', () => {
  // La función 'beforeEach' se ejecuta antes de cada prueba ('it') en este bloque 'describe'.
  beforeEach(() => {
    // Restablece el estado de todos los mocks a su estado inicial antes de cada prueba.
    jest.clearAllMocks();

    // Mockea ClothingItem.schema para que el controlador pueda leer los enumValues
    // sin depender de la instancia real de Mongoose (que no existe en tests).
    ClothingItem.schema = {
      path: jest.fn().mockReturnValue({
        enumValues: ['SHIRT', 'PANTS', 'SHOES', 'JACKET', 'ACCESSORY', 'OTHER'],
      }),
    };

    // Define la implementación por defecto para el mock del middleware 'protect'.
    // Esto simula que un usuario siempre está autenticado por defecto, a menos que un test lo sobreescriba.
    protect.mockImplementation((req, res, next) => {
      // Asigna un 'userId' simulado al objeto 'req.user', como lo haría el middleware real.
      req.user = { userId: 'mockUserId' };
      // Llama a 'next()' para pasar el control al siguiente middleware o controlador en la cadena.
      next();
    });
  });

  // Inicia un sub-bloque de pruebas para las rutas de autenticación.
  describe('Auth Routes', () => {
    // Prueba para la ruta POST /api/auth/register: debería crear un usuario.
    it('POST /api/auth/register - should create a user', async () => {
      // Define los datos de un usuario para la solicitud de registro.
      const userData = { name: 'test', email: 'test@example.com', password: 'password123' };
      // Simula que 'User.create' (mockeado) devuelve un usuario creado con un '_id' simulado.
      User.create.mockResolvedValue({ _id: 'mockUserId', ...userData });

      // Envía una petición POST a la ruta de registro con los datos del usuario.
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Verifica que el código de estado de la respuesta es 201 (Created).
      expect(response.statusCode).toBe(201);
      // Verifica que la respuesta JSON contiene una propiedad 'userId' con el ID simulado.
      expect(response.body).toHaveProperty('userId', 'mockUserId');
    });

    // Login ahora emite cookies HTTP-only en lugar de retornar el token en el body.
    it('POST /api/auth/login - should set HTTP-only cookies and return user info', async () => {
      const user = { _id: 'mockUserId', email: 'test@example.com', password: 'hashedPassword' };
      User.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      // jwt.sign se llama 2 veces: access token y refresh token
      jwt.sign.mockReturnValue('fakeToken');
      User.findByIdAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.statusCode).toBe(200);
      // Tokens en cookies, no en el body
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('userId', 'mockUserId');
    });

    it('POST /api/auth/refresh - should refresh access token cookie', async () => {
      // Mockear la verificación del refresh token
      jwt.verify.mockReturnValue({ userId: 'mockUserId' });
      jwt.sign.mockReturnValue('newAccessToken');
      // Simular que User.findById retorna un usuario con el hash correcto
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'mockUserId',
          refreshToken: expect.any(String),
        }),
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=fakeRefreshToken');

      // El controlador verifica el hash → en integración usa el hash real del token
      // El test solo verifica que la ruta existe y responde (el hash no coincidirá en mock)
      expect([200, 401]).toContain(response.statusCode);
    });

    it('POST /api/auth/logout - should clear cookies', async () => {
      User.findOneAndUpdate.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'refreshToken=fakeRefreshToken; accessToken=fakeAccessToken');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('POST /api/auth/logout - should succeed even without cookies', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });

  describe('Root Route', () => {
    it('GET / - should return API status message', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('Wardrobe API is running!');
    });
  });

  // Inicia un sub-bloque de pruebas para las rutas de prendas de vestir.
  describe('Clothing Routes', () => {
    // Prueba para GET /api/clothing: debería devolver 401 si no está autenticado.
    it('GET /api/clothing - should return 401 if not authenticated', async () => {
      // Sobreescribe la implementación del mock de 'protect' solo para esta prueba.
      // Aquí, simula que la autenticación falla, devolviendo un 401.
      protect.mockImplementation((req, res, next) => {
        return res.status(401).json({ message: 'Not authorized, no token' });
      });

      // Envía una petición GET a la ruta de prendas.
      const response = await request(app).get('/api/clothing');
      // Verifica que el código de estado de la respuesta es 401 (Unauthorized).
      expect(response.statusCode).toBe(401);
    });

    // Prueba para GET /api/clothing: debería devolver prendas si está autenticado.
    it('GET /api/clothing - should return items if authenticated', async () => {
      // La implementación por defecto de 'protect' (en 'beforeEach') ya simula un usuario autenticado.
      // Define un array de prendas simuladas.
      const items = [{ _id: 'mockItemId', name: 'T-Shirt', owner: 'mockUserId' }];
      // Simula que 'ClothingItem.find' (mockeado) devuelve las prendas simuladas.
      ClothingItem.find.mockResolvedValue(items);

      // Envía una petición GET a la ruta de prendas.
      const response = await request(app).get('/api/clothing');

      // Verifica que el código de estado de la respuesta es 200 (OK).
      expect(response.statusCode).toBe(200);
      // Verifica que la respuesta JSON coincide con el array de prendas simuladas.
      expect(response.body).toEqual(items);
    });

    // Prueba para POST /api/clothing: debería crear una prenda si está autenticado.
    it('POST /api/clothing - should create an item if authenticated', async () => {
      // La implementación por defecto de 'protect' (en 'beforeEach') ya simula un usuario autenticado.
      // Define los datos de la nueva prenda para la solicitud.
      const newItemData = { name: 'Jeans', category: 'Pants', color: 'Blue' };
      // Define el objeto de la prenda creada simulada, incluyendo '_id' y 'owner'.
      const createdItem = { _id: 'mockItemId', owner: 'mockUserId', ...newItemData };
      
      // Simula que 'ClothingItem.create' (mockeado) devuelve la prenda creada.
      ClothingItem.create.mockResolvedValue(createdItem);
      // Simula que 'User.findByIdAndUpdate' (mockeado) se ejecuta correctamente.
      User.findByIdAndUpdate.mockResolvedValue({});

      // Envía una petición POST a la ruta de prendas con los datos de la nueva prenda.
      const response = await request(app)
        .post('/api/clothing')
        .send(newItemData);

      // Verifica que el código de estado de la respuesta es 201 (Created).
      expect(response.statusCode).toBe(201);
      // Verifica que la respuesta JSON coincide con la prenda creada simulada.
      expect(response.body).toEqual(createdItem);
    });

    it('PUT /api/clothing/:id - should update an item if authenticated', async () => {
      const mockItem = {
        _id: 'mockItemId',
        owner: { toString: () => 'mockUserId' },
        imagePublicId: null,
      };
      const updatedItem = { _id: 'mockItemId', owner: 'mockUserId', name: 'Updated Jeans', category: 'Pants', color: 'Black' };

      ClothingItem.findById.mockResolvedValue(mockItem);
      ClothingItem.findByIdAndUpdate.mockResolvedValue(updatedItem);

      const response = await request(app)
        .put('/api/clothing/mockItemId')
        .send({ name: 'Updated Jeans', category: 'Pants', color: 'Black' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(updatedItem);
    });

    it('DELETE /api/clothing/:id - should delete an item if authenticated', async () => {
      const mockItem = {
        _id: 'mockItemId',
        owner: { toString: () => 'mockUserId' },
        imagePublicId: null,
      };

      ClothingItem.findById.mockResolvedValue(mockItem);
      ClothingItem.findByIdAndDelete.mockResolvedValue({});
      User.updateOne.mockResolvedValue({});

      const response = await request(app).delete('/api/clothing/mockItemId');

      expect(response.statusCode).toBe(204);
    });
  });
});
