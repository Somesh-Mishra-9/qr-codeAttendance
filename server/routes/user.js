import express from 'express';
import { auth, adminAuth } from '../middlewares/auth.middleware.js';
import { User } from '../models/user.model.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', adminAuth, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

export default router;