import express from 'express';
import { login, register, verifyToken } from '../controllers/auth.controller.js';
import { adminAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.get('/verify', verifyToken);

// Protected routes
router.post('/register', adminAuth, register);

export default router;