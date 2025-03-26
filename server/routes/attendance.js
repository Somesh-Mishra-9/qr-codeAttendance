import express from 'express';
import multer from 'multer';
import { markAttendance, getStats, getHistory, importCSV, getAttendees, createAttendee } from '../controllers/attendance.controller.js';
import { auth, adminAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Protected routes
router.get('/attendees', auth, getAttendees);
router.post('/attendee', adminAuth, createAttendee);
router.post('/mark', auth, markAttendance);
router.get('/stats', auth, getStats);
router.get('/history', auth, getHistory);
router.post('/import', adminAuth, upload.single('file'), importCSV);

export default router;