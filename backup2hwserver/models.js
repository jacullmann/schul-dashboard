import dayjs from 'dayjs';
import crypto from 'crypto';

export function initModels(mongoose) {
    const Schema = mongoose.Schema;

    const EncryptedTodoSchema = new Schema({
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'HwUser',
            required: true,
            index: true
        },
        encryptedTitle: {
            type: {
                iv: String,
                data: String,
                authTag: String
            },
            required: true
        },
        encryptedContent: {
            type: {
                iv: String,
                data: String,
                authTag: String
            },
            default: { iv: '', data: '', authTag: '' }
        },
        encryptedDueDate: {
            type: {
                iv: String,
                data: String,
                authTag: String
            },
            default: null
        },
        completed: {
            type: Boolean,
            default: false
        }
    }, {
        timestamps: true
    });
    EncryptedTodoSchema.index({ userId: 1, createdAt: -1 });

    const EncryptedTodo = mongoose.model('EncryptedTodo', EncryptedTodoSchema);

    const UserSchema = new Schema({
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
        personalized: { type: Boolean, default: true },
        activity: [{
            at: { type: Date, default: Date.now },
            type: { type: String },
            meta: { type: Schema.Types.Mixed }
        }]
    }, { timestamps: true });

    const BannedUserSchema = new Schema({
        userId: { type: Schema.Types.ObjectId, ref: 'HwUser', index: true, unique: true, required: true },
        bannedAt: { type: Date, default: Date.now }
    }, { timestamps: true });

    const VerificationSchema = new Schema({
        email: { type: String, index: true },
        token: { type: String, unique: true },
        expiresAt: { type: Date }
    }, { timestamps: true });

    const SubjectSchema = new Schema({
        name: { type: String, unique: true, required: true }
    }, { timestamps: true });

    const AnnouncementSchema = new Schema({
        content: String,
        color: { type: String, default: 'warn' },
        showAsPopup: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: 'HwUser' }
    }, { timestamps: true });

    const ItemSchema = new Schema({
        type: { type: String, enum: ['HAUSAUFGABE', 'DALTON', 'PRUEFUNG'], index: true },
        title: { type: String, required: true },
        subject: { type: String, required: true },
        description: { type: String },
        images: [{
            url: String,
            thumbUrl: String,
            publicId: String,
            createdBy: { type: Schema.Types.ObjectId, ref: 'HwUser' }
        }],
        dueDate: { type: Date, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'HwUser', index: true },
        editorNote: { type: String, default: '' }
    }, { timestamps: true });

    const KeepCheckedSchema = new Schema({
        itemId: { type: Schema.Types.ObjectId, ref: 'HwItem', index: true, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'HwUser', index: true, required: true },
        checkedAt: { type: Date, default: Date.now }
    }, { timestamps: false });
    KeepCheckedSchema.index({ itemId: 1, userId: 1 }, { unique: true });

    const ReportSchema = new Schema({
        itemId: { type: Schema.Types.ObjectId, index: true, required: true },
        itemTitle: { type: String, required: true },
        category: {
            type: String,
            enum: ['illegal', 'falschinfo'],
            default: 'illegal'
        },
        reason: { type: String },
        reporterId: { type: Schema.Types.ObjectId, ref: 'HwUser', index: true, default: null },
        reporterEmail: { type: String, default: 'anonymous' },
        reportedAt: { type: Date, default: Date.now }
    }, { timestamps: true });

    const TimetableSubSchema = new Schema({
        lessonId: { type: Number, required: true, index: true },
        day: { type: String },
        slot: { type: Number },
        duration: { type: Number },
        subject: { type: String },
        subject_abbr: { type: String },
        teacher: { type: String },
        room: { type: String },
        cancelled: { type: Boolean, default: false },
        hide: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }, { timestamps: true });

    const TimetableSub = mongoose.model('HwTimetableSub', TimetableSubSchema);

    const SorgenSchema = new Schema({
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    });

    const PasswordResetSchema = new Schema({
        email: { type: String, index: true, required: true, lowercase: true, trim: true },
        code: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        used: { type: Boolean, default: false }
    }, { timestamps: true });
    PasswordResetSchema.index({ email: 1, code: 1 });

    const TimetableSchema = new Schema({
        lessons: [{
            id: { type: Number, required: true },
            day: { type: String, required: true },
            slot: { type: Number, required: true },
            duration: { type: Number, required: true },
            room: { type: String, default: null },
            teacher: { type: String, default: null },
            subject: { type: String, required: true },
            subject_abbr: { type: String }
        }],
        updatedAt: { type: Date, default: Date.now }
    }, { timestamps: true });

    const Timetable = mongoose.model('HwTimetable', TimetableSchema);

    const User = mongoose.model('HwUser', UserSchema);
    const BannedUser = mongoose.model('HwBannedUser', BannedUserSchema);
    const Verification = mongoose.model('HwVerification', VerificationSchema);
    const Subject = mongoose.model('HwSubject', SubjectSchema);
    const Announcement = mongoose.model('HwAnnouncement', AnnouncementSchema);
    const Item = mongoose.model('HwItem', ItemSchema);
    const KeepChecked = mongoose.model('HwKeepChecked', KeepCheckedSchema);
    const Report = mongoose.model('HwReport', ReportSchema);
    const Sorgen = mongoose.model('Sorgen', SorgenSchema);
    const PasswordReset = mongoose.model('HwPasswordReset', PasswordResetSchema);

    return {
        User,
        BannedUser,
        Verification,
        Subject,
        Announcement,
        Item,
        KeepChecked,
        Report,
        Sorgen,
        PasswordReset,
        EncryptedTodo,
        TimetableSub,
        Timetable
    };
}

export async function ensureSubjects(SubjectModel) {
    const Subject = SubjectModel?.find ? SubjectModel : SubjectModel.Subject || SubjectModel;
    const DEFAULT_SUBJECTS = [
        'Mathe', 'Deutsch', 'Englisch', 'Französisch', 'Erdkunde', 'Sport',
        'Biologie', 'Chemie', 'Physik', 'Ethik', 'Politik', 'Musik',
        'Enrichment',
        'WPU (Di)',
        'WPU (Do)',
        'Theater'
    ];
    for (const s of DEFAULT_SUBJECTS) {
        await Subject.updateOne({ name: s }, { $set: { name: s } }, { upsert: true });
    }
    await Subject.deleteOne({ name: 'WPU' });
}

export function buildThumbUrl(secureUrl) {
    try {
        const u = new URL(secureUrl);
        const parts = u.pathname.split('/');
        const uploadIdx = parts.findIndex(p => p === 'upload');
        if (uploadIdx !== -1) {
            parts.splice(uploadIdx + 1, 0, 'f_webp,q_auto:best,w_120,h_120,c_fill');
            u.pathname = parts.join('/');
        }
        return u.toString();
    } catch {
        return secureUrl;
    }
}

export function withThumb(img) {
    return {
        url: img.url,
        thumbUrl: img.thumbUrl || buildThumbUrl(img.url),
        publicId: img.publicId,
        createdBy: img.createdBy
    };
}

export function timeLeftColor(dueDate) {
    const now = dayjs();
    const due = dayjs(dueDate);
    const diffDays = due.diff(now, 'day', true);
    if (diffDays < 0) return 'expired';
    if (diffDays < 1) return 'danger';
    if (diffDays < 2) return 'warn';
    if (diffDays < 3) return 'normal';
    return 'ok';
}
