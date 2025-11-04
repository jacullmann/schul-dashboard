// models.js
import mongoose from 'mongoose';
import { DEFAULT_SUBJECTS } from './config.js';

// User Schema
export const UserSchema = new mongoose.Schema({
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

export const User = mongoose.model('HwUser', UserSchema);

// Banned User Schema
export const BannedUserSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true, unique: true, required: true },
    bannedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const BannedUser = mongoose.model('HwBannedUser', BannedUserSchema);

// Verification Schema
export const VerificationSchema = new mongoose.Schema({
    email: { type: String, index: true },
    token: { type: String, unique: true },
    expiresAt: { type: Date }
}, { timestamps: true });

export const Verification = mongoose.model('HwVerification', VerificationSchema);

// Subject Schema
export const SubjectSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true }
}, { timestamps: true });

export const Subject = mongoose.model('HwSubject', SubjectSchema);

// Announcement Schema
export const AnnouncementSchema = new mongoose.Schema({
    title: String,
    content: String,
    color: { type: String, default: 'warn' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser' }
}, { timestamps: true });

export const Announcement = mongoose.model('HwAnnouncement', AnnouncementSchema);

// Item Schema
export const ItemSchema = new mongoose.Schema({
    type: { type: String, enum: ['HAUSAUFGABE', 'DALTON', 'PRUEFUNG'], index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String },
    images: [{
        url: String,
        thumbUrl: String,
        publicId: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser' }
    }],
    dueDate: { type: Date, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true }
}, { timestamps: true });

export const Item = mongoose.model('HwItem', ItemSchema);

// KeepChecked Schema
export const KeepCheckedSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwItem', index: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true, required: true },
    checkedAt: { type: Date, default: Date.now }
}, { timestamps: false });

KeepCheckedSchema.index({ itemId: 1, userId: 1 }, { unique: true });
export const KeepChecked = mongoose.model('HwKeepChecked', KeepCheckedSchema);

// Report Schema
export const ReportSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
    itemTitle: { type: String, required: true },
    reason: { type: String },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HwUser', index: true, default: null },
    reporterEmail: { type: String, default: 'anonymous' },
    reportedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Report = mongoose.model('HwReport', ReportSchema);

// Sorgen Schema
export const SorgenSchema = new mongoose.Schema({
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export const SorgenModel = mongoose.model('Sorgen', SorgenSchema);

// Password Reset Schema
export const PasswordResetSchema = new mongoose.Schema({
    email: { type: String, index: true, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
}, { timestamps: true });

PasswordResetSchema.index({ email: 1, code: 1 });
export const PasswordReset = mongoose.model('HwPasswordReset', PasswordResetSchema);

// Default Subjects seed function
export async function ensureSubjects() {
    for (const s of DEFAULT_SUBJECTS) {
        await Subject.updateOne({ name: s }, { $set: { name: s } }, { upsert: true });
    }
}