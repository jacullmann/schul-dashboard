import { Router } from 'express';
import { body, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dayjs from 'dayjs';

export default function createAuthRoutes(deps) {
    const router = Router();
    const {
        models,
        appGateSecret,
        userSecret,
        csrfSecret,
        passwordResetSecret,
        emailService,
        requireAppGate,
        requireUser,
        checkUser,
        setUserToken,
        clearUserToken,
        validateCsrf,
        rotateCsrfToken,
        authLimiter,
        passwordResetLimiter,
        sendJSONError,
        validate
    } = deps;

    const { User, BannedUser, Verification, PasswordReset, KeepChecked, EncryptedTodo } = models;

    // POST /api/auth/login
    router.post('/login',
        authLimiter,
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
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
            if (isBanned) return sendJSONError(res, 403, 'Dein Account ist gesperrt.');
            setUserToken(res, user._id, user.email, userSecret);
            rotateCsrfToken(res, csrfSecret);
            await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() } });
            res.json({ ok: true });
        }
    );

    // POST /api/auth/register
    router.post('/register',
        authLimiter,
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        body('email').isEmail(),
        body('password').isString().isLength({ min: 8 }),
        validate,
        async (req, res) => {
            const { email, password } = req.body;
            const exists = await User.findOne({ email: email.toLowerCase() });
            if (exists) return sendJSONError(res, 400, 'E-Mail bereits registriert');
            const passwordHash = await bcrypt.hash(password, 12);
            const user = await User.create({
                email: email.toLowerCase(),
                passwordHash,
                emailVerified: false
            });
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = dayjs().add(2, 'day').toDate();
            await Verification.create({ email: user.email, token, expiresAt });
            const verifyUrl = `${process.env.CLIENT_VERIFY_URL}?token=${token}`;
            try {
                await emailService.sendVerificationEmail(user.email, verifyUrl);
                res.status(201).json({ ok: true, message: 'Registriert. Bitte überprüfe deine E-Mail sowie deinen Spamordner.' });
            } catch (mailErr) {
                console.error('Failed to send verification email:', mailErr);
                res.status(201).json({
                    ok: true,
                    message: 'Registriert. E-Mail konnte nicht versendet werden. Bitte später erneut oder Support kontaktieren.'
                });
            }
        }
    );

    // POST /api/auth/logout
    router.post('/logout',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        (req, res) => {
            clearUserToken(res);
            rotateCsrfToken(res, csrfSecret);
            res.json({ ok: true });
        }
    );

    // GET /api/auth/me
    router.get('/me',
        requireAppGate(appGateSecret),
        checkUser(userSecret, User),
        async (req, res) => {
            try {
                if (!req.user) {
                    return res.json({ authenticated: false });
                }
                const user = await User.findById(req.user.sub).lean();
                if (!user) {
                    return res.json({ authenticated: false });
                }
                res.json({
                    authenticated: true,
                    id: user._id,
                    email: user.email,
                    isAdmin: !!user?.isAdmin,
                    emailVerified: !!user?.emailVerified,
                    enrKurs: user.enrKurs,
                    wpuKurs1: user.wpuKurs1,
                    wpuKurs2: user.wpuKurs2,
                    theater: user.theater,
                    doneSetup: !!user?.doneSetup,
                    personalized: user.personalized !== false
                });
            } catch (err) {
                console.error('GET /api/auth/me error', err);
                res.status(500).json({ error: 'Serverfehler', authenticated: false });
            }
        }
    );

    // DELETE /api/auth/me
    router.delete('/me',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const user = await User.findById(req.user.sub);
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                if (user.isAdmin) return sendJSONError(res, 403, 'Admins können ihren Account nicht löschen');
                const userId = user._id;
                await KeepChecked.deleteMany({ userId });
                await EncryptedTodo.deleteMany({ userId });
                await User.deleteOne({ _id: userId });
                clearUserToken(res);
                rotateCsrfToken(res, csrfSecret);
                res.json({ ok: true });
            } catch (err) {
                console.error('DELETE /api/auth/me error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // GET /api/auth/verify
    router.get('/verify',
        passwordResetLimiter,
        query('token').isString().isLength({ min: 10 }),
        validate,
        async (req, res) => {
            const ver = await Verification.findOne({ token: req.query.token });
            if (!ver) return sendJSONError(res, 400, 'Ungültiger Token');
            if (dayjs(ver.expiresAt).isBefore(dayjs())) return sendJSONError(res, 400, 'Token abgelaufen');
            const user = await User.findOneAndUpdate({ email: ver.email }, { $set: { emailVerified: true } }, { new: true });
            if (!user) return sendJSONError(res, 400, 'Nutzer nicht gefunden');
            await Verification.deleteMany({ email: ver.email });
            res.json({ ok: true });
        }
    );

    // POST /api/auth/forgot
    router.post('/forgot',
        authLimiter,
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        body('email').isEmail(),
        validate,
        async (req, res) => {
            try {
                const email = req.body.email.toLowerCase();
                const user = await User.findOne({ email });
                if (!user) return res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
                const code = crypto.randomBytes(3).toString('hex').toUpperCase();
                const expiresAt = dayjs().add(30, 'minute').toDate();
                await PasswordReset.updateMany({ email }, { $set: { used: true } });
                await PasswordReset.create({ email, code, expiresAt, used: false });
                try {
                    await emailService.sendPasswordResetEmail(email, code);
                } catch (mailErr) {
                    console.error('Senden der Reset-Email fehlgeschlagen:', mailErr?.message || mailErr);
                }
                res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });
            } catch (err) {
                console.error('POST /api/auth/forgot error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/auth/reset/verify
    router.post('/reset/verify',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        body('email').isEmail(),
        body('code').isString().isLength({ min: 6, max: 6 }),
        validate,
        async (req, res) => {
            try {
                const email = req.body.email.toLowerCase();
                const code = String(req.body.code).trim();
                const pr = await PasswordReset.findOne({ email, code, used: false })
                    .sort({ createdAt: -1 });
                if (!pr) return sendJSONError(res, 400, 'Ungültiger Code');
                if (dayjs(pr.expiresAt).isBefore(dayjs())) {
                    return sendJSONError(res, 400, 'Code abgelaufen');
                }
                pr.used = true;
                await pr.save();
                const resetToken = jwt.sign(
                    { email, purpose: 'password_reset' },
                    passwordResetSecret,
                    { expiresIn: '15m' }
                );
                res.json({ ok: true, resetToken });
            } catch (err) {
                console.error('POST /api/auth/reset/verify error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/auth/reset
    router.post('/reset',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        body('resetToken').isString(),
        body('password').isString().isLength({ min: 8 }),
        validate,
        async (req, res) => {
            try {
                const { resetToken, password } = req.body;
                let payload;
                try {
                    payload = jwt.verify(resetToken, passwordResetSecret);
                } catch {
                    return sendJSONError(res, 400, 'Ungültiger oder abgelaufener Reset-Token');
                }
                if (payload?.purpose !== 'password_reset' || !payload?.email) {
                    return sendJSONError(res, 400, 'Ungültiger Reset-Token');
                }
                const email = String(payload.email).toLowerCase();
                const user = await User.findOne({ email });
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                const passwordHash = await bcrypt.hash(password, 12);
                await User.findByIdAndUpdate(user._id, { $set: { passwordHash } });
                await User.findByIdAndUpdate(user._id, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'account:password_reset',
                            meta: { by: 'self' }
                        }
                    }
                });
                res.json({ ok: true, message: 'Passwort wurde geändert.' });
            } catch (err) {
                console.error('POST /api/auth/reset error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/auth/change-password
    router.post('/change-password',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        [
            body('currentPassword').isString().isLength({ min: 8 }),
            body('newPassword').isString().isLength({ min: 8 })
        ],
        validate,
        async (req, res) => {
            try {
                const { currentPassword, newPassword } = req.body;
                const userId = req.user.sub;

                const user = await User.findById(userId);
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                const isCorrect = await bcrypt.compare(currentPassword, user.passwordHash);
                if (!isCorrect) {
                    return sendJSONError(res, 403, 'Aktuelles Passwort ist falsch');
                }

                const newPasswordHash = await bcrypt.hash(newPassword, 12);
                await User.findByIdAndUpdate(userId, { $set: { passwordHash: newPasswordHash } });

                await User.findByIdAndUpdate(userId, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'account:password_change',
                            meta: { by: 'self' }
                        }
                    }
                });

                res.json({ ok: true, message: 'Passwort erfolgreich geändert.' });
            } catch (err) {
                console.error('POST /api/auth/change-password error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    return router;
}