// routes/uploads.js
import express from 'express';

import { requireAuth } from '../middleware/index.js';
import { signUpload } from '../utils/cloudinary.js';

const router = express.Router();

// Cloudinary signed upload
router.post('/sign', requireAuth, signUpload);

export default router;