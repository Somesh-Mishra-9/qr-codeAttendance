import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Route imports
import authRoutes from './routes/auth.js';
import attendanceRoutes from './routes/attendance.js';
import userRoutes from './routes/user.js';

// Load environment variables
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours in seconds
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);

// API health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const startServer = async () => {
    const defaultPort = process.env.PORT || 5000;
    let port = defaultPort;
    let isPortAvailable = false;

    while (!isPortAvailable) {
        try {
            await new Promise((resolve, reject) => {
                const server = app.listen(port)
                    .once('listening', () => {
                        isPortAvailable = true;
                        console.log(`Server running on port ${port}`);
                        resolve();
                    })
                    .once('error', (err) => {
                        if (err.code === 'EADDRINUSE') {
                            port++;
                            server.close();
                            resolve();
                        } else {
                            reject(err);
                        }
                    });
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
};

startServer();