// Importa las funciones del controlador de autenticación que vamos a probar: 'register' y 'login'.
import { register, login } from '../controllers/auth.controller.js';
// Importa el modelo 'User' de Mongoose, que el controlador utiliza para interactuar con la base de datos de usuarios.
import User from '../models/user.model.js';
// Importa la librería 'bcryptjs', utilizada por el controlador para hashear y comparar contraseñas.
import bcrypt from 'bcryptjs';
// Importa la librería 'jsonwebtoken', utilizada por el controlador para firmar y verificar tokens de autenticación.
import jwt from 'jsonwebtoken';

// Mockea el módulo del modelo 'User'. Esto significa que cualquier operación sobre 'User' (como 'create', 'findOne')
// dentro del controlador se ejecutará sobre una versión simulada, sin tocar la base de datos real.
jest.mock('../models/user.model.js');
// Mockea la librería 'bcryptjs'. Las llamadas a 'bcrypt.hash' y 'bcrypt.compare' devolverán valores predefinidos por el mock.
jest.mock('bcryptjs');
// Mockea la librería 'jsonwebtoken'. Las llamadas a 'jwt.sign' y 'jwt.verify' devolverán valores predefinidos por el mock.
jest.mock('jsonwebtoken');

// Inicia un bloque de pruebas para el "Auth Controller". Esto agrupa pruebas relacionadas con el controlador de autenticación.
describe('Auth Controller', () => {
  // Declara variables para los objetos de solicitud (request) y respuesta (response) de Express.
  // Estas variables se reasignarán con objetos simulados antes de cada prueba.
  let req, res;

  // La función 'beforeEach' se ejecuta antes de cada prueba ('it') en este bloque 'describe'.
  beforeEach(() => {
    // Restablece el estado de todos los mocks (contadores de llamadas, valores devueltos) a su estado inicial.
    jest.clearAllMocks();

    // Inicializa el objeto 'req' (request) con un cuerpo vacío, que simula el cuerpo de una petición HTTP.
    req = {
      body: {},
    };
    // Inicializa el objeto 'res' (response) con funciones simuladas para Jest.
    res = {
      // Mockea el método 'status' de la respuesta. 'mockReturnThis()' permite encadenar métodos (e.g., res.status(200).json()).
      status: jest.fn().mockReturnThis(),
      // Mockea el método 'json' de la respuesta, que se usa para enviar datos JSON al cliente.
      json: jest.fn(),
    };
  });

  // Inicia un sub-bloque de pruebas para la función 'register' del controlador.
  describe('register', () => {
    // Define una prueba individual: verifica que se puede crear un usuario exitosamente.
    it('should create a user successfully', async () => {
      // Configura el 'body' del objeto 'req' con los datos de registro de un usuario.
      req.body = { name: 'test', email: 'test@example.com', password: 'password123' };
      
      // Simula que 'bcrypt.hash' siempre resuelve con una contraseña hasheada predefinida.
      bcrypt.hash.mockResolvedValue('hashedPassword');
      // Simula que 'User.create' (la función mockeada de Mongoose) resuelve exitosamente, devolviendo un objeto de usuario.
      // El objeto incluye un '_id' simulado (típico de MongoDB) y los datos del cuerpo de la petición.
      User.create.mockResolvedValue({ _id: 'mockUserId', ...req.body });

      // Llama a la función 'register' del controlador con los objetos 'req' y 'res' simulados.
      await register(req, res);

      // Verifica que la función 'User.create' del modelo (mockeada) fue llamada.
      expect(User.create).toHaveBeenCalled();
      // Verifica que el método 'status' de la respuesta fue llamado con el código HTTP 201 (Created).
      expect(res.status).toHaveBeenCalledWith(201);
      // Verifica que el método 'json' de la respuesta fue llamado con un objeto que contiene un mensaje de éxito y el 'userId' simulado.
      expect(res.json).toHaveBeenCalledWith({ message: 'User created successfully', userId: 'mockUserId' });
    });

    // Define una prueba individual: verifica que se devuelve un error 409 si el email ya existe.
    it('should return 409 if email already exists', async () => {
      // Configura el 'body' del objeto 'req' con un email que ya debería existir.
      req.body = { email: 'test@example.com', password: 'password123' };

      // Simula que 'User.create' (mockeado) rechaza la operación con un error de código 11000,
      // que en Mongoose indica una clave única duplicada (email ya existe).
      User.create.mockRejectedValue({ code: 11000 });

      // Llama a la función 'register'.
      await register(req, res);

      // Verifica que la respuesta tiene el código de estado HTTP 409 (Conflict).
      expect(res.status).toHaveBeenCalledWith(409);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de error esperado.
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
    });

    // Define una prueba individual: verifica que se devuelve un error 400 si no se proporcionan email o contraseña.
    it('should return 400 if email or password are not provided', async () => {
      // Configura el 'body' del objeto 'req' sin los campos 'email' y 'password' requeridos.
      req.body = { name: 'test' };

      // Llama a la función 'register'.
      await register(req, res);

      // Verifica que la respuesta tiene el código de estado HTTP 400 (Bad Request).
      expect(res.status).toHaveBeenCalledWith(400);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de error de campos requeridos.
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });
  });

  // Inicia un sub-bloque de pruebas para la función 'login' del controlador.
  describe('login', () => {
    // Define una prueba individual: verifica que un usuario puede iniciar sesión y recibir un token.
    it('should login a user and return a token', async () => {
      // Configura el 'body' del objeto 'req' con las credenciales de login.
      req.body = { email: 'test@example.com', password: 'password123' };
      // Crea un objeto 'user' simulado que sería devuelto por la base de datos, incluyendo su '_id' y contraseña hasheada.
      const user = { _id: 'mockUserId', email: 'test@example.com', password: 'hashedPassword' };

      // Simula que 'User.findOne' (mockeado) encuentra al usuario por su email.
      User.findOne.mockResolvedValue(user);
      // Simula que 'bcrypt.compare' (mockeado) confirma que la contraseña proporcionada es correcta.
      bcrypt.compare.mockResolvedValue(true);
      // Simula que 'jwt.sign' (mockeado) devuelve un token de autenticación falso.
      jwt.sign.mockReturnValue('fakeToken');

      // Llama a la función 'login' del controlador.
      await login(req, res);

      // Verifica que 'User.findOne' fue llamado con un objeto de filtro que busca por 'email'.
      expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
      // Verifica que 'bcrypt.compare' fue llamado con la contraseña del request y la contraseña hasheada del usuario simulado.
      expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, user.password);
      // Verifica que el método 'json' de la respuesta fue llamado con un objeto que contiene el token falso.
      expect(res.json).toHaveBeenCalledWith({ token: 'fakeToken' });
    });

    // Define una prueba individual: verifica que se devuelve un error 401 si el usuario no es encontrado.
    it('should return 401 if user is not found', async () => {
      // Configura el 'body' del objeto 'req' con credenciales de un usuario que no existe.
      req.body = { email: 'notfound@example.com', password: 'password123' };

      // Simula que 'User.findOne' (mockeado) no encuentra ningún usuario, devolviendo 'null'.
      User.findOne.mockResolvedValue(null);

      // Llama a la función 'login'.
      await login(req, res);

      // Verifica que la respuesta tiene el código de estado HTTP 401 (Unauthorized).
      expect(res.status).toHaveBeenCalledWith(401);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de credenciales inválidas.
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    // Define una prueba individual: verifica que se devuelve un error 401 si la contraseña es incorrecta.
    it('should return 401 if password is incorrect', async () => {
      // Configura el 'body' del objeto 'req' con un email existente pero una contraseña incorrecta.
      req.body = { email: 'test@example.com', password: 'wrongpassword' };
      // Crea un objeto 'user' simulado.
      const user = { _id: 'mockUserId', email: 'test@example.com', password: 'hashedPassword' };

      // Simula que 'User.findOne' encuentra al usuario.
      User.findOne.mockResolvedValue(user);
      // Simula que 'bcrypt.compare' (mockeado) indica que la contraseña proporcionada es incorrecta.
      bcrypt.compare.mockResolvedValue(false);

      // Llama a la función 'login'.
      await login(req, res);

      // Verifica que la respuesta tiene el código de estado HTTP 401 (Unauthorized).
      expect(res.status).toHaveBeenCalledWith(401);
      // Verifica que el método 'json' de la respuesta fue llamado con el mensaje de credenciales inválidas.
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
  });
});
