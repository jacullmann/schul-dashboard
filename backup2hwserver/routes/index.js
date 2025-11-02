// routes/index.js
import express from 'express';
import rateLimit from 'express-rate-limit';

import { generalLimiter } from '../middleware/rateLimit.js';
import authRoutes from './auth.js';
import itemRoutes from './items.js';
import adminRoutes from './admin.js';
import announcementRoutes from './announcements.js';
import subjectRoutes from './subjects.js';
import uploadRoutes from './uploads.js';
import checkRoutes from './checks.js';
import reportRoutes from './reports.js';
import sorgenRoutes from './sorgen.js';
import dashboardRoutes from './dashboard.js';

const router = express.Router();

// Apply general rate limiting to all routes
router.use(generalLimiter);

// Mount routes
router.use('/', authRoutes);
router.use('/items', itemRoutes);
router.use('/admin', adminRoutes);
router.use('/announcements', announcementRoutes);
router.use('/subjects', subjectRoutes);
router.use('/uploads', uploadRoutes);
router.use('/checks', checkRoutes);
router.use('/reports', reportRoutes);
router.use('/', sorgenRoutes);
router.use('/', dashboardRoutes);

// Server status
router.get('/serverstatus', async (req, res) => {
    res.status(200).json({ status: 'good' });
});

export default router;