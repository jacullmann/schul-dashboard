// routes/auth.js
import express from 'express';
import { body, query } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dayjs from 'dayjs';

import { User, Verification, BannedUser, PasswordReset } from '../models/index.js';
import { requireAuth, validate } from '../middleware/index.js';
import { sendJSONError } from '../utils/helpers.js';
import { logActivity } from '../utils/activityLogger.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import config from '../config/index.js';

const router = express.Router();

// Registration
router.post('/auth/register',
    body('email').isEmail(),
    body('password').isString().isLength({ min: 8 }),
    validate,
    async (req, res) => {
        const { email, password } = req.body;
        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) return sendJSONError(res, 400, 'E-Mail bereits registriert');
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ email: email.toLowerCase(), passwordHash, emailVerified: false });
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = dayjs().add(2, 'day').toDate();
        await Verification.create({ email: user.email, token, expiresAt });
        const verifyUrl = `${process.env.CLIENT_VERIFY_URL}?token=${token}`;
        try {
            await sendVerificationEmail(user.email, verifyUrl);
            res.status(201).json({ ok: true, message: 'Registriert. Bitte E-Mail prüfen.' });
        } catch (mailErr) {
            console.error('Failed to send verification email (SendGrid):', mailErr);
            res.status(201).json({
                ok: true,
                message: 'Registriert. E-Mail konnte nicht versendet werden. Bitte später erneut oder Support kontaktieren.'
            });
        }
    }
);

// Email verification
router.get('/auth/verify',
    query('token').isString().isLength({ min: 10 }),
    validate,
    async (req, res) => {
        const ver = await Verification.findOne({ token: req.query.token });
        if (!ver) return sendJSONError(res, 400, 'Ungültiger Token');
        if (dayjs(ver.expiresAt).isBefore(dayjs())) return sendJSONError(res, 400, 'Token abgelaufen');
        const user = await User.findOneAndUpdate({ email: ver.email }, { $set: { emailVerified: true } }, { new: true });
        if (!user) return sendJSONError(res, 400, 'Nutzer nicht gefunden');
        await Verification.deleteOne({ _id: ver._id });
        res.json({ ok: true });
    }
);

// Login
router.post('/auth/login',
    body('email').isEmail(),
    body('password').isString().isLength({ min: 8 }),
    validate,
    async (req, res) => {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return sendJSONError(res, 401, 'Ungültige Zugangsdaten');
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return sendJSONError(res, 401, 'Ungültige Zugangsdaten');
        if (!user.emailVerified) return sendJSONError(res, 401, 'Bitte E-Mail zuerst verifizieren');
        const isBanned = await BannedUser.findOne({ userId: user._id }).lean();
        if (isBanned) {
            return sendJSONError(res, 403, 'Dein Account ist gesperrt.');
        }
        const token = jwt.sign({ sub: user._id, email: user.email }, config.JWT_SECRET, { expiresIn: '7d' });
        await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() } });
        res.json({ token });
    }
);

// Get current user
router.get('/auth/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.user.sub).lean();
    if (!user) {
        return sendJSONError(res, 404, 'Ungültiges Token.');
    }
    res.json({
        id: user._id,
        email: user.email,
        isAdmin: !!user?.isAdmin,
        emailVerified: !!user?.emailVerified,
        enrKurs: user.enrKurs,
        wpuKurs1: user.wpuKurs1,
        wpuKurs2: user.wpuKurs2,
        theater: user.theater,
        doneSetup: !!user?.doneSetup
    });
});

// User setup
router.patch('/user/setup',
    requireAuth,
    body('enrKurs').exists().withMessage('enrKurs ist erforderlich').isInt({ min: 0 }).toInt(),
    body('wpuKurs1').exists().withMessage('wpuKurs1 ist erforderlich').isInt({ min: 0 }).toInt(),
    body('wpuKurs2').exists().withMessage('wpuKurs2 ist erforderlich').isInt({ min: 0 }).toInt(),
    body('theater').exists().withMessage('Theater ist erforderlich').isInt({ min: 0 }).toInt(),
    validate,
    async (req, res) => {
        const { enrKurs, wpuKurs1, wpuKurs2, theater } = req.body;
        const userId = req.user.sub;

        const updateData = {
            enrKurs,
            wpuKurs1,
            wpuKurs2,
            theater,
            doneSetup: true,
        };

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, fields: 'enrKurs wpuKurs1 wpuKurs2 theater doneSetup email isAdmin' }
        );

        if (!updatedUser) {
            return sendJSONError(res, 404, 'Nutzer nicht gefunden');
        }

        await logActivity(userId, 'profile:setup:complete', { enrKurs, wpuKurs1, wpuKurs2, theater });

        res.json({
            ok: true,
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                isAdmin: updatedUser.isAdmin,
                enrKurs: updatedUser.enrKurs,
                wpuKurs1: updatedUser.wpuKurs1,
                wpuKurs2: updatedUser.wpuKurs2,
                theater: updatedUser.theater,
                doneSetup: updatedUser.doneSetup
            }
        });
    }
);

// Delete own account
router.delete('/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
        if (user.isAdmin) return sendJSONError(res, 403, 'Admins können ihren Account nicht löschen');

        await User.deleteOne({ _id: user._id });
        await logActivity(user._id, 'account:delete', { by: user._id });
        res.json({ ok: true });
    } catch (err) {
        console.error('DELETE /api/auth/me error', err);
        sendJSONError(res, 500, 'Server error');
    }
});

// Password reset - forgot
router.post('/auth/forgot',
    body('email').isEmail(),
    validate,
    async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const user = await User.findOne({ email });
            if (!user) {
                return res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
            }

            const code = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = dayjs().add(30, 'minute').toDate();

            await PasswordReset.updateMany({ email }, { $set: { used: true } });
            await PasswordReset.create({ email, code, expiresAt, used: false });

            try {
                await sendPasswordResetEmail(email, code);
            } catch (mailErr) {
                console.error('Send reset email failed', mailErr?.response?.body || mailErr?.message || mailErr);
            }

            res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
        } catch (err) {
            console.error('POST /api/auth/forgot error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

// Password reset - verify code
router.post('/auth/reset/verify',
    body('email').isEmail(),
    body('code').isString().isLength({ min: 6, max: 6 }),
    validate,
    async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const code = String(req.body.code).trim();

            const pr = await PasswordReset.findOne({ email, code, used: false }).sort({ createdAt: -1 });
            if (!pr) return sendJSONError(res, 400, 'Ungültiger Code');
            if (dayjs(pr.expiresAt).isBefore(dayjs())) return sendJSONError(res, 400, 'Code abgelaufen');

            pr.used = true;
            await pr.save();

            const resetToken = jwt.sign({ email, purpose: 'password_reset' }, config.JWT_SECRET, { expiresIn: '15m' });
            res.json({ ok: true, resetToken });
        } catch (err) {
            console.error('POST /api/auth/reset/verify error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

// Password reset - final reset
router.post('/auth/reset',
    body('resetToken').isString(),
    body('password').isString().isLength({ min: 8 }),
    validate,
    async (req, res) => {
        try {
            const { resetToken, password } = req.body;
            let payload;
            try {
                payload = jwt.verify(resetToken, config.JWT_SECRET);
            } catch {
                return sendJSONError(res, 400, 'Ungültiger oder abgelaufener Reset-Token');
            }
            if (payload?.purpose !== 'password_reset' || !payload?.email) return sendJSONError(res, 400, 'Ungültiger Reset-Token');

            const email = String(payload.email).toLowerCase();
            const user = await User.findOne({ email });
            if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

            const passwordHash = await bcrypt.hash(password, 12);
            await User.findByIdAndUpdate(user._id, { $set: { passwordHash } });
            await logActivity(user._id, 'account:password_reset', { by: 'self' });
            res.json({ ok: true, message: 'Passwort wurde geändert.' });
        } catch (err) {
            console.error('POST /api/auth/reset error', err);
            sendJSONError(res, 500, 'Server error');
        }
    }
);

export default router;