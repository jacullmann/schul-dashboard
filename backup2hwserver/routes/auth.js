import { Router } from 'express';
import { body, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { authenticator } from '@otplib/preset-v11';
import { mfaVerifyLimiter } from '../middleware/rateLimiters.js';
import {
    generateMfaPendingToken,
    clearMfaPendingToken,
    verifyMfaPendingToken,
} from '../middleware/mfaAuth.js';
import * as db from '../db/db.js';

export default function createAuthRoutes(deps) {
    const router = Router();
    const {
        supabase,
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
        validate,
        decryptData,
    } = deps;

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
            const user = await db.findUserByEmail(supabase, email, 'id, email, password_hash, email_verified, mfa_enabled, mfa_secret');

            if (!user) return sendJSONError(res, 401, 'Ungültige Zugangsdaten');
            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) return sendJSONError(res, 401, 'Ungültige Zugangsdaten');
            if (!user.email_verified) return sendJSONError(res, 401, 'Bitte E-Mail zuerst verifizieren');

            if (await db.isBanned(supabase, user.id)) {
                return sendJSONError(res, 403, 'Dein Account ist gesperrt.');
            }

            if (user.mfa_enabled && user.mfa_secret) {
                generateMfaPendingToken(res, user.id, email, passwordResetSecret);
                return res.json({ ok: true, requiresMfa: true, message: 'MFA-Verifizierung erforderlich' });
            }

            setUserToken(res, user.id, user.email, userSecret);
            const newCsrfToken = rotateCsrfToken(res, csrfSecret);
            await db.updateUser(supabase, user.id, { last_login_at: new Date().toISOString() });
            await db.deleteMfaPending(supabase, user.id).catch(() => { });
            res.json({ ok: true, csrfToken: newCsrfToken });
        }
    );

    // POST /api/auth/mfa/verify
    router.post('/mfa/verify',
        mfaVerifyLimiter,
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        verifyMfaPendingToken(passwordResetSecret),
        body('code').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
        validate,
        async (req, res) => {
            try {
                const { code } = req.body;
                const userId = req.mfaPending.sub;
                const email = req.mfaPending.email;

                const user = await db.findUserById(supabase, userId, 'id, mfa_enabled, mfa_secret');

                if (!user || !user.mfa_enabled || !user.mfa_secret) {
                    clearMfaPendingToken(res);
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
                }

                const secret = await decryptData(user.mfa_secret, userId);
                const isValid = authenticator.check(code, secret);

                if (!isValid) {
                    await db.logActivity(supabase, userId, 'auth:mfa_login_failed', { ip: req.ip });
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
                }

                clearMfaPendingToken(res);
                setUserToken(res, userId, email, userSecret);
                const newCsrfToken = rotateCsrfToken(res, csrfSecret);

                await db.updateUser(supabase, userId, { last_login_at: new Date().toISOString() });
                await db.deleteMfaPending(supabase, userId).catch(() => { });
                await db.logActivity(supabase, userId, 'auth:mfa_login', {});

                res.json({ ok: true, csrfToken: newCsrfToken });
            } catch (err) {
                console.error('POST /api/auth/mfa/verify error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/auth/mfa/cancel
    router.post('/mfa/cancel',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        (req, res) => {
            clearMfaPendingToken(res);
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
            const exists = await db.findUserByEmail(supabase, email, 'id');
            if (exists) return sendJSONError(res, 400, 'E-Mail bereits registriert');

            const passwordHash = await bcrypt.hash(password, 12);
            const user = await db.createUser(supabase, { email: email.toLowerCase(), passwordHash });

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = dayjs().add(2, 'day').toISOString();
            await db.createVerification(supabase, { email: user.email, token, expiresAt });

            const verifyUrl = `${process.env.CLIENT_VERIFY_URL}?token=${token}`;
            try {
                await emailService.sendVerificationEmail(user.email, verifyUrl);
                res.status(201).json({ ok: true, message: 'Registriert. Bitte überprüfe deine E-Mail sowie deinen Spamordner.' });
            } catch (mailErr) {
                console.error('Failed to send verification email:', mailErr);
                res.status(201).json({
                    ok: true,
                    message: 'Registriert. E-Mail konnte nicht versendet werden. Bitte später erneut oder Support kontaktieren.',
                });
            }
        }
    );

    // POST /api/auth/logout
    router.post('/logout',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        (req, res) => {
            clearUserToken(res);
            clearMfaPendingToken(res);
            const newCsrfToken = rotateCsrfToken(res, csrfSecret);
            res.json({ ok: true, csrfToken: newCsrfToken });
        }
    );

    // GET /api/auth/me
    router.get('/me',
        requireAppGate(appGateSecret),
        checkUser(userSecret, supabase),
        async (req, res) => {
            try {
                if (!req.user) return res.json({ authenticated: false });

                const user = await db.findUserById(supabase, req.user.sub, '*, user_roles(roles(name))');
                if (!user) return res.json({ authenticated: false });

                res.json({
                    authenticated: true,
                    id: user.id,
                    email: user.email,
                    role: user.user_roles?.[0]?.roles?.name || 'user',
                    emailVerified: !!user.email_verified,
                    enrKurs: user.enr_kurs,
                    wpuKurs1: user.wpu_kurs_1,
                    wpuKurs2: user.wpu_kurs_2,
                    theater: user.theater,
                    doneSetup: !!user.done_setup,
                    personalized: user.personalized !== false,
                    mfaEnabled: !!user.mfa_enabled,
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
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const user = await db.findUserById(supabase, req.user.sub, 'id, user_roles(roles(name))');
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                if (user.user_roles?.[0]?.roles?.name === 'superadmin') return sendJSONError(res, 403, 'Adminkonten können nicht gelöscht werden.');

                const userId = user.id;
                // Cascading deletes handle keep_checked, pinned_items, encrypted_todos, etc.
                await db.deleteUser(supabase, userId);

                clearUserToken(res);
                clearMfaPendingToken(res);
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
            const ver = await db.findVerification(supabase, req.query.token);
            if (!ver) return sendJSONError(res, 400, 'Ungültiger Token');
            if (dayjs(ver.expires_at).isBefore(dayjs())) return sendJSONError(res, 400, 'Token abgelaufen');

            const user = await db.findUserByEmail(supabase, ver.email, 'id');
            if (!user) return sendJSONError(res, 400, 'Nutzer nicht gefunden');

            await db.updateUser(supabase, user.id, { email_verified: true });
            await db.deleteVerificationsByEmail(supabase, ver.email);
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
                const user = await db.findUserByEmail(supabase, email, 'id');
                if (!user) return res.json({ ok: true, message: 'Wenn die E-Mail existiert, wurde ein Code versendet.' });

                const code = crypto.randomBytes(3).toString('hex').toUpperCase();
                const expiresAt = dayjs().add(30, 'minute').toISOString();

                await db.markAllResetsUsed(supabase, email);
                await db.createPasswordReset(supabase, { email, code, expiresAt });

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
        passwordResetLimiter,
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        body('email').isEmail(),
        body('code').isString().isLength({ min: 6, max: 6 }),
        validate,
        async (req, res) => {
            try {
                const email = req.body.email.toLowerCase();
                const code = String(req.body.code).trim();

                const pr = await db.findValidReset(supabase, email, code);
                if (!pr) return sendJSONError(res, 400, 'Ungültiger Code');
                if (dayjs(pr.expires_at).isBefore(dayjs())) return sendJSONError(res, 400, 'Code abgelaufen');

                await db.markResetUsed(supabase, pr.id);

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
        passwordResetLimiter,
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
                const user = await db.findUserByEmail(supabase, email, 'id, mfa_enabled');
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                const passwordHash = await bcrypt.hash(password, 12);
                await db.updateUser(supabase, user.id, {
                    password_hash: passwordHash,
                    mfa_enabled: false,
                    mfa_secret: null,
                });

                await db.logActivity(supabase, user.id, 'account:password_reset', {
                    by: 'self',
                    mfaWasEnabled: !!user.mfa_enabled,
                    mfaDisabled: true,
                });

                try {
                    await emailService.sendSecurityEmail(email);
                } catch (e) {
                    console.error('Security alert email failed.', e);
                }

                res.json({ ok: true, message: 'Passwort wurde geändert. MFA wurde deaktiviert.' });
            } catch (err) {
                console.error('POST /api/auth/reset error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/auth/change-password
    router.post('/change-password',
        authLimiter,
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        [
            body('currentPassword').isString().isLength({ min: 8 }),
            body('newPassword').isString().isLength({ min: 8 }),
        ],
        validate,
        async (req, res) => {
            try {
                const { currentPassword, newPassword } = req.body;
                const userId = req.user.sub;

                const user = await db.findUserById(supabase, userId, 'id, password_hash');
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                const isCorrect = await bcrypt.compare(currentPassword, user.password_hash);
                if (!isCorrect) return sendJSONError(res, 403, 'Aktuelles Passwort ist falsch');

                const newPasswordHash = await bcrypt.hash(newPassword, 12);
                await db.updateUser(supabase, userId, { password_hash: newPasswordHash });
                await db.logActivity(supabase, userId, 'account:password_change', { by: 'self' });

                res.json({ ok: true, message: 'Passwort erfolgreich geändert.' });
            } catch (err) {
                console.error('POST /api/auth/change-password error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    return router;
}