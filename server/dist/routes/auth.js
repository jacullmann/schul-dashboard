// routes/auth.ts
import { Router } from 'express';
import { body, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { authenticator } from '@otplib/preset-v11';
import { mfaVerifyLimiter } from '../middleware/rateLimiters.js';
import { generateMfaPendingToken, clearMfaPendingToken, verifyMfaPendingToken, } from '../middleware/mfaAuth.js';
import * as db from '../db/db.js';
function isWeakPassword(password) {
    if (password.length < 8)
        return true;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return !(hasLetter && hasNumber);
}
export default function createAuthRoutes(deps) {
    const router = Router();
    const { supabase, authSecret, passwordResetSecret, mfaPendingSecret, emailService, requireAuth, checkAuth, setAuthToken, clearAuthToken, validateCsrf, rotateCsrfToken, authLimiter, passwordResetLimiter, sendJSONError, validate, decryptData, } = deps;
    // POST /api/auth/login
    router.post('/login', authLimiter, checkAuth(authSecret), validateCsrf(), body('email').isEmail(), body('password').isString().isLength({ min: 8 }), validate, async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await db.findUserByEmail(supabase, email, 'id, email, password_hash, email_verified, mfa_enabled, mfa_secret, user_roles(roles(name), tenant_id)');
            if (!user) {
                sendJSONError(res, 401, 'Ungültige Zugangsdaten');
                return;
            }
            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) {
                sendJSONError(res, 401, 'Ungültige Zugangsdaten');
                return;
            }
            if (!user.email_verified) {
                sendJSONError(res, 401, 'Bitte E-Mail zuerst verifizieren');
                return;
            }
            if (await db.isBanned(supabase, user.id)) {
                sendJSONError(res, 403, 'Dein Account ist gesperrt.');
                return;
            }
            if (user.mfa_enabled && user.mfa_secret) {
                generateMfaPendingToken(res, user.id, email, mfaPendingSecret);
                res.json({
                    ok: true,
                    requiresMfa: true,
                    message: 'MFA-Verifizierung erforderlich',
                });
                return;
            }
            const newCsrfToken = rotateCsrfToken(res);
            await db.updateUser(supabase, user.id, {
                last_login_at: new Date().toISOString(),
            });
            await db.deleteMfaPending(supabase, user.id).catch(() => {
                /* ignore */
            });
            const userRoles = user.user_roles;
            const globalRole = userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';
            const { data: firstGroup } = await supabase
                .from('user_roles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .not('tenant_id', 'is', null)
                .limit(1)
                .maybeSingle();
            setAuthToken(res, authSecret, {
                userId: user.id,
                email: user.email,
                globalRole,
                activeGroupId: firstGroup?.tenant_id ?? null,
            });
            res.json({ ok: true, csrfToken: newCsrfToken });
        }
        catch (err) {
            console.error('POST /api/auth/login error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });
    // POST /api/auth/mfa/verify
    router.post('/mfa/verify', mfaVerifyLimiter, checkAuth(authSecret), validateCsrf(), verifyMfaPendingToken(mfaPendingSecret), body('code')
        .isString()
        .isLength({ min: 6, max: 6 })
        .matches(/^\d{6}$/), validate, async (req, res) => {
        try {
            const { code } = req.body;
            const userId = req.mfaPending.sub;
            const email = req.mfaPending.email;
            const user = await db.findUserById(supabase, userId, 'id, email, mfa_enabled, mfa_secret, user_roles(roles(name), tenant_id)');
            if (!user || !user.mfa_enabled || !user.mfa_secret) {
                clearMfaPendingToken(res);
                await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
                sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
                return;
            }
            const secret = await decryptData(user.mfa_secret, userId);
            const isValid = authenticator.check(code, secret);
            if (!isValid) {
                await db.logActivity(supabase, userId, 'auth:mfa_login_failed', {
                    ip: req.ip,
                });
                await new Promise((r) => setTimeout(r, 100 + Math.random() * 100));
                sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
                return;
            }
            clearMfaPendingToken(res);
            const newCsrfToken = rotateCsrfToken(res);
            await db.updateUser(supabase, userId, {
                last_login_at: new Date().toISOString(),
            });
            await db.deleteMfaPending(supabase, userId).catch(() => {
                /* ignore */
            });
            await db.logActivity(supabase, userId, 'auth:mfa_login', {});
            const userRoles = user.user_roles;
            const globalRole = userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';
            const { data: firstGroup } = await supabase
                .from('user_roles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .not('tenant_id', 'is', null)
                .limit(1)
                .maybeSingle();
            setAuthToken(res, authSecret, {
                userId: user.id,
                email: user.email,
                globalRole,
                activeGroupId: firstGroup?.tenant_id ?? null,
            });
            res.json({ ok: true, csrfToken: newCsrfToken });
        }
        catch (err) {
            console.error('POST /api/auth/mfa/verify error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });
    // POST /api/auth/mfa/cancel
    router.post('/mfa/cancel', checkAuth(authSecret), validateCsrf(), (_req, res) => {
        clearMfaPendingToken(res);
        res.json({ ok: true });
    });
    // POST /api/auth/register
    router.post('/register', authLimiter, checkAuth(authSecret), validateCsrf(), body('email').isEmail(), body('password').isString().isLength({ min: 8 }), validate, async (req, res) => {
        const { email, password } = req.body;
        if (isWeakPassword(password)) {
            sendJSONError(res, 400, 'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.');
            return;
        }
        const exists = await db.findUserByEmail(supabase, email, 'id');
        if (exists) {
            sendJSONError(res, 400, 'E-Mail bereits registriert');
            return;
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await db.createUser(supabase, {
            email: email.toLowerCase(),
            passwordHash,
        });
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = dayjs().add(2, 'day').toISOString();
        await db.createVerification(supabase, {
            email: user.email,
            token,
            expiresAt,
        });
        const verifyUrl = `${process.env.CLIENT_VERIFY_URL}?token=${token}`;
        try {
            await emailService.sendVerificationEmail(user.email, verifyUrl);
            res.status(201).json({
                ok: true,
                message: 'Registriert. Bitte überprüfe deine E-Mail sowie deinen Spamordner.',
            });
        }
        catch (mailErr) {
            console.error('Failed to send verification email:', mailErr);
            res.status(201).json({
                ok: true,
                message: 'Registriert. E-Mail konnte nicht versendet werden. Bitte später erneut oder Support kontaktieren.',
            });
        }
    });
    // POST /api/auth/logout
    router.post('/logout', requireAuth(authSecret, supabase), validateCsrf(), (_req, res) => {
        clearAuthToken(res);
        clearMfaPendingToken(res);
        const newCsrfToken = rotateCsrfToken(res);
        res.json({ ok: true, csrfToken: newCsrfToken });
    });
    // GET /api/auth/me
    router.get('/me', checkAuth(authSecret), async (req, res) => {
        try {
            if (!req.user) {
                res.json({ authenticated: false });
                return;
            }
            const user = await db.findUserById(supabase, req.user.sub, '*, user_roles(tenant_id, roles(name))');
            if (!user) {
                res.json({ authenticated: false });
                return;
            }
            const userRoles = user.user_roles;
            const globalRoleName = userRoles?.find((ur) => !ur.tenant_id)?.roles?.name || 'user';
            const tenantRoleName = userRoles?.find((ur) => ur.tenant_id === req.activeGroupId)?.roles
                ?.name || null;
            res.json({
                authenticated: true,
                id: user.id,
                email: user.email,
                role: globalRoleName,
                tenantRole: tenantRoleName,
                emailVerified: !!user.email_verified,
                enrKurs: user.enr_kurs,
                wpuKurs1: user.wpu_kurs_1,
                wpuKurs2: user.wpu_kurs_2,
                theater: user.theater,
                doneSetup: !!user.done_setup,
                personalized: user.personalized !== false,
                mfaEnabled: !!user.mfa_enabled,
            });
        }
        catch (err) {
            console.error('GET /api/auth/me error', err);
            res.status(500).json({ error: 'Serverfehler', authenticated: false });
        }
    });
    // DELETE /api/auth/me
    router.delete('/me', requireAuth(authSecret, supabase), validateCsrf(), async (req, res) => {
        try {
            const user = await db.findUserById(supabase, req.user.sub, 'id, user_roles(roles(name))');
            if (!user) {
                sendJSONError(res, 404, 'Nutzer nicht gefunden');
                return;
            }
            const userRoles = user.user_roles;
            if (userRoles?.some((ur) => ur.roles?.name === 'superadmin')) {
                sendJSONError(res, 403, 'Adminkonten können nicht gelöscht werden.');
                return;
            }
            const userId = user.id;
            await db.deleteUser(supabase, userId);
            clearAuthToken(res);
            clearMfaPendingToken(res);
            rotateCsrfToken(res);
            res.json({ ok: true });
        }
        catch (err) {
            console.error('DELETE /api/auth/me error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });
    // GET /api/auth/verify
    router.get('/verify', passwordResetLimiter, query('token').isString().isLength({ min: 10 }), validate, async (req, res) => {
        const ver = await db.findVerification(supabase, req.query.token);
        if (!ver) {
            sendJSONError(res, 400, 'Ungültiger Token');
            return;
        }
        if (dayjs(ver.expires_at).isBefore(dayjs())) {
            sendJSONError(res, 400, 'Token abgelaufen');
            return;
        }
        const user = await db.findUserByEmail(supabase, ver.email, 'id');
        if (!user) {
            sendJSONError(res, 400, 'Nutzer nicht gefunden');
            return;
        }
        await db.updateUser(supabase, user.id, {
            email_verified: true,
        });
        await db.deleteVerificationsByEmail(supabase, ver.email);
        res.json({ ok: true });
    });
    // POST /api/auth/forgot
    router.post('/forgot', authLimiter, checkAuth(authSecret), validateCsrf(), body('email').isEmail(), validate, async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const user = await db.findUserByEmail(supabase, email, 'id');
            if (!user) {
                res.json({
                    ok: true,
                    message: 'Wenn die E-Mail existiert, wurde ein Code versendet.',
                });
                return;
            }
            const code = crypto.randomBytes(3).toString('hex').toUpperCase();
            const expiresAt = dayjs().add(30, 'minute').toISOString();
            await db.markAllResetsUsed(supabase, email);
            await db.createPasswordReset(supabase, { email, code, expiresAt });
            try {
                await emailService.sendPasswordResetEmail(email, code);
            }
            catch (mailErr) {
                const errMsg = mailErr instanceof Error ? mailErr.message : mailErr;
                console.error('Senden der Reset-Email fehlgeschlagen:', errMsg);
            }
            res.json({
                ok: true,
                message: 'Wenn die E-Mail existiert, wurde ein Code versendet.',
            });
        }
        catch (err) {
            console.error('POST /api/auth/forgot error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });
    // POST /api/auth/reset/verify
    router.post('/reset/verify', passwordResetLimiter, checkAuth(authSecret), validateCsrf(), body('email').isEmail(), body('code').isString().isLength({ min: 6, max: 6 }), validate, async (req, res) => {
        try {
            const email = req.body.email.toLowerCase();
            const code = String(req.body.code).trim();
            const pr = await db.findValidReset(supabase, email, code);
            if (!pr) {
                sendJSONError(res, 400, 'Ungültiger Code');
                return;
            }
            if (dayjs(pr.expires_at).isBefore(dayjs())) {
                sendJSONError(res, 400, 'Code abgelaufen');
                return;
            }
            await db.markResetUsed(supabase, pr.id);
            const resetToken = jwt.sign({ email, purpose: 'password_reset' }, passwordResetSecret, { expiresIn: '15m' });
            res.json({ ok: true, resetToken });
        }
        catch (err) {
            console.error('POST /api/auth/reset/verify error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });
    // POST /api/auth/reset
    router.post('/reset', passwordResetLimiter, checkAuth(authSecret), validateCsrf(), body('resetToken').isString(), body('password').isString().isLength({ min: 8 }), validate, async (req, res) => {
        try {
            const { resetToken, password } = req.body;
            if (isWeakPassword(password)) {
                sendJSONError(res, 400, 'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.');
                return;
            }
            let payload;
            try {
                payload = jwt.verify(resetToken, passwordResetSecret);
            }
            catch {
                sendJSONError(res, 400, 'Ungültiger oder abgelaufener Reset-Token');
                return;
            }
            if (payload?.purpose !== 'password_reset' || !payload?.email) {
                sendJSONError(res, 400, 'Ungültiger Reset-Token');
                return;
            }
            const email = String(payload.email).toLowerCase();
            const user = await db.findUserByEmail(supabase, email, 'id, mfa_enabled');
            if (!user) {
                sendJSONError(res, 404, 'Nutzer nicht gefunden');
                return;
            }
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
            }
            catch (e) {
                console.error('Security alert email failed.', e);
            }
            res.json({
                ok: true,
                message: 'Passwort wurde geändert. MFA wurde deaktiviert.',
            });
        }
        catch (err) {
            console.error('POST /api/auth/reset error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });
    // POST /api/auth/change-password
    router.post('/change-password', authLimiter, requireAuth(authSecret, supabase), validateCsrf(), [
        body('currentPassword').isString().isLength({ min: 8 }),
        body('newPassword').isString().isLength({ min: 8 }),
    ], validate, async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            if (isWeakPassword(newPassword)) {
                sendJSONError(res, 400, 'Passwort muss mindestens 8 Zeichen lang sein und Buchstaben sowie Zahlen enthalten.');
                return;
            }
            const userId = req.user.sub;
            const user = await db.findUserById(supabase, userId, 'id, password_hash');
            if (!user) {
                sendJSONError(res, 404, 'Nutzer nicht gefunden');
                return;
            }
            const isCorrect = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isCorrect) {
                sendJSONError(res, 403, 'Aktuelles Passwort ist falsch');
                return;
            }
            const newPasswordHash = await bcrypt.hash(newPassword, 12);
            await db.updateUser(supabase, userId, {
                password_hash: newPasswordHash,
            });
            await db.logActivity(supabase, userId, 'account:password_change', {
                by: 'self',
            });
            res.json({ ok: true, message: 'Passwort erfolgreich geändert.' });
        }
        catch (err) {
            console.error('POST /api/auth/change-password error', err);
            sendJSONError(res, 500, 'Server error');
        }
    });
    // GET /api/auth/groups
    router.get('/groups', requireAuth(authSecret, supabase), async (req, res) => {
        try {
            const { data: userRoles, error } = await supabase
                .from('user_roles')
                .select('tenant_id, groups(id, name), roles(name)')
                .eq('user_id', req.userId)
                .not('tenant_id', 'is', null);
            if (error)
                throw error;
            const groups = (userRoles || [])
                .filter((ur) => ur.groups?.id)
                .map((ur) => ({
                id: ur.groups.id,
                name: ur.groups.name,
                role: ur.roles?.name,
            }));
            res.json({ groups });
        }
        catch (err) {
            console.error('GET /api/auth/groups error', err);
            res.status(500).json({ error: 'Fehler beim Laden der Gruppen' });
        }
    });
    return router;
}
//# sourceMappingURL=auth.js.map