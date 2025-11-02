// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    enrKurs: { type: Number, default: 0 },
    wpuKurs1: { type: Number, default: 0 },
    wpuKurs2: { type: Number, default: 0 },
    theater: { type: Number, default: 0 },
    doneSetup: { type: Boolean, default: false },
    activity: [{
        at: { type: Date, default: Date.now },
        type: { type: String },
        meta: { type: mongoose.Schema.Types.Mixed }
    }]
}, { timestamps: true });

export default mongoose.model('HwUser', UserSchema);