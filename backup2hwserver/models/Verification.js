// models/Verification.js
import mongoose from 'mongoose';

const VerificationSchema = new mongoose.Schema({
    email: { type: String, index: true },
    token: { type: String, unique: true },
    expiresAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('HwVerification', VerificationSchema);