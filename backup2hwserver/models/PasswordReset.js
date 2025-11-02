// models/PasswordReset.js
import mongoose from 'mongoose';

const PasswordResetSchema = new mongoose.Schema({
    email: { type: String, index: true, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
}, { timestamps: true });

PasswordResetSchema.index({ email: 1, code: 1 });

export default mongoose.model('HwPasswordReset', PasswordResetSchema);