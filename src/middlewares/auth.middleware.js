import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  // Lee el access token desde la cookie HTTP-only, NO desde Authorization header.
  // Las cookies HTTP-only son inaccesibles al JS del navegador → protección contra XSS.
  const token = req.cookies?.accessToken;
  console.log('[MIDDLEWARE] Verificando token desde cookie:', token ? 'presente' : 'ausente');

  if (!token) {
    console.log('[MIDDLEWARE] No se proporcionó token.');
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[MIDDLEWARE] Token válido. Usuario decodificado:', decoded);
    req.user = decoded; // Adds user payload to request
    next();
  } catch (error) {
    console.log('[MIDDLEWARE] Token inválido:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
