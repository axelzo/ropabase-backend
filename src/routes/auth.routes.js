import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', (req, res, next) => {
	console.log('[ROUTE] POST /api/auth/register llamada');
	next();
}, register);
router.post('/login', (req, res, next) => {
	console.log('[ROUTE] POST /api/auth/login llamada');
	next();
}, login);
router.post('/refresh', (req, res, next) => {
	console.log('[ROUTE] POST /api/auth/refresh llamada');
	next();
}, refresh);
router.post('/logout', (req, res, next) => {
	console.log('[ROUTE] POST /api/auth/logout llamada');
	next();
}, logout);

export default router;
