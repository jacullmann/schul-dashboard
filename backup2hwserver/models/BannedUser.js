// models/BannedUser.js
import mongoose from 'mongoose';

const BannedUserSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true, unique: true, required: true },
    bannedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('HwBannedUser', BannedUserSchema);