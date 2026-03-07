import { Router } from 'express';
import { body } from 'express-validator';
import { authenticator } from '@otplib/preset-v11';
import QRCode from 'qrcode';
import { mfaVerifyLimiter } from '../middleware/rateLimiters.js';
import * as db from '../db/db.js';

export default function createMfaRoutes(deps) {
    const router = Router();
    const {
        supabase,
        authSecret,
        csrfSecret,
        requireAuth,
        validateCsrf,
        sendJSONError,
        validate,
        encryptData,
        decryptData,
        authLimiter,
    } = deps;

    // GET /api/mfa/status
    router.get('/status',
        requireAuth(authSecret, supabase),
        async (req, res) => {
            try {
                const user = await db.findUserById(supabase, req.user.sub, 'mfa_enabled');
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                res.json({
                    ok: true,
                    mfaEnabled: !!user.mfa_enabled,
                });
            } catch (err) {
                console.error('GET /api/mfa/status error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/mfa/setup
    router.post('/setup',
        requireAuth(authSecret, supabase),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const userId = req.user.sub;
                const user = await db.findUserById(supabase, userId, 'email, mfa_enabled');

                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                if (user.mfa_enabled) return sendJSONError(res, 400, 'MFA ist bereits aktiviert');

                // Altes Pending-Secret löschen falls vorhanden
                await db.deleteMfaPending(supabase, userId).catch(() => {});

                // Neues Secret generieren
                const secret = authenticator.generateSecret();
                const encryptedSecret = await encryptData(secret, userId);

                // Pending-Secret speichern (15 Minuten gültig)
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                await db.upsertMfaPending(supabase, {
                    userId,
                    encryptedSecret,
                    expiresAt,
                });

                // QR-Code generieren
                const issuer = 'Schul-Dashboard';
                const accountName = user.email;
                const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);
                const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
                    width: 200,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' },
                });

                await db.logActivity(supabase, userId, 'mfa:setup:started', {});

                res.json({
                    ok: true,
                    qrCode: qrCodeDataUrl,
                    secret, // Für manuelle Eingabe
                    expiresAt,
                });
            } catch (err) {
                console.error('POST /api/mfa/setup error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/mfa/activate
    router.post('/activate',
        mfaVerifyLimiter,
        requireAuth(authSecret, supabase),
        validateCsrf(csrfSecret),
        body('code').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
        validate,
        async (req, res) => {
            try {
                const userId = req.user.sub;
                const { code } = req.body;

                // Pending-Secret abrufen
                const pending = await db.findMfaPending(supabase, userId);

                if (!pending) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // Secret entschlüsseln und Code verifizieren
                const secret = await decryptData(pending.encrypted_secret, userId);
                const isValid = authenticator.check(code, secret);

                if (!isValid) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // MFA aktivieren: Secret verschlüsselt in User speichern
                const encryptedSecret = await encryptData(secret, userId);
                await db.updateUser(supabase, userId, {
                    mfa_enabled: true,
                    mfa_secret: encryptedSecret,
                });

                // Pending-Secret löschen
                await db.deleteMfaPending(supabase, userId);

                await db.logActivity(supabase, userId, 'mfa:activated', {});

                res.json({ ok: true, message: 'MFA erfolgreich aktiviert' });
            } catch (err) {
                console.error('POST /api/mfa/activate error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/mfa/deactivate
    router.post('/deactivate',
        mfaVerifyLimiter,
        requireAuth(authSecret, supabase),
        validateCsrf(csrfSecret),
        body('code').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
        validate,
        async (req, res) => {
            try {
                const userId = req.user.sub;
                const { code } = req.body;

                const user = await db.findUserById(supabase, userId, 'mfa_enabled, mfa_secret');
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                if (!user.mfa_enabled || !user.mfa_secret) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // Secret entschlüsseln und Code verifizieren
                const secret = await decryptData(user.mfa_secret, userId);
                const isValid = authenticator.check(code, secret);

                if (!isValid) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // MFA deaktivieren
                await db.updateUser(supabase, userId, {
                    mfa_enabled: false,
                    mfa_secret: null,
                });

                await db.logActivity(supabase, userId, 'mfa:deactivated', { ip: req.ip });

                res.json({ ok: true, message: 'MFA erfolgreich deaktiviert' });
            } catch (err) {
                console.error('POST /api/mfa/deactivate error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    return router;
}