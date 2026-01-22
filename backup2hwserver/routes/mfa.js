import { Router } from 'express';
import { body } from 'express-validator';
import { authenticator } from '@otplib/preset-v11';
import QRCode from 'qrcode';
import { mfaVerifyLimiter } from '../middleware/rateLimiters.js';

export default function createMfaRoutes(deps) {
    const router = Router();
    const {
        models,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        validateCsrf,
        sendJSONError,
        validate,
        encryptData, // Hier nochmal genau gucken, da die beiden Funktionen eigentlich für die Ver und Entschlüsselung von privaten EInträgen gedacht waren - Kompatibilität prüfen
        decryptData, //
        authLimiter
    } = deps;

    const { User, BannedUser, MfaPendingSecret } = models;

    // GET /api/mfa/status - MFA-Status des Users abrufen
    router.get('/status',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        async (req, res) => {
            try {
                const user = await User.findById(req.user.sub).select('mfaEnabled').lean();
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                res.json({
                    ok: true,
                    mfaEnabled: !!user.mfaEnabled
                });
            } catch (err) {
                console.error('GET /api/mfa/status error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/mfa/setup - MFA-Setup starten (generiert temporäres Secret)
    router.post('/setup',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const userId = req.user.sub;
                const user = await User.findById(userId).select('email mfaEnabled').lean();

                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                if (user.mfaEnabled) return sendJSONError(res, 400, 'MFA ist bereits aktiviert');

                // Altes Pending-Secret löschen falls vorhanden
                await MfaPendingSecret.deleteMany({ userId });

                // Neues Secret generieren
                const secret = authenticator.generateSecret();
                const encryptedSecret = await encryptData(secret, userId);

                // Pending-Secret speichern (15 Minuten gültig)
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
                await MfaPendingSecret.create({
                    userId,
                    encryptedSecret,
                    expiresAt
                });

                // QR-Code generieren
                const issuer = 'Schul-Dashboard';
                const accountName = user.email;
                const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);
                const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                });

                // Activity loggen
                await User.findByIdAndUpdate(userId, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'mfa:setup:started',
                            meta: {}
                        }
                    }
                });

                res.json({
                    ok: true,
                    qrCode: qrCodeDataUrl,
                    secret: secret, // Für manuelle Eingabe – Sicherheitsrisiko, aber vorerst lassen
                    expiresAt: expiresAt.toISOString()
                });
            } catch (err) {
                console.error('POST /api/mfa/setup error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/mfa/activate - MFA aktivieren (nach TOTP-Verifikation)
    router.post('/activate',
        mfaVerifyLimiter,
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        body('code').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
        validate,
        async (req, res) => {
            try {
                const userId = req.user.sub;
                const { code } = req.body;

                // Pending-Secret abrufen
                const pending = await MfaPendingSecret.findOne({
                    userId,
                    expiresAt: { $gt: new Date() }
                });

                if (!pending) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // Secret entschlüsseln und Code verifizieren
                const secret = await decryptData(pending.encryptedSecret, userId);
                const isValid = authenticator.check(code, secret);

                if (!isValid) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // MFA aktivieren: Secret verschlüsselt in User speichern
                const encryptedSecret = await encryptData(secret, userId);
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        mfaEnabled: true,
                        mfaSecret: encryptedSecret
                    }
                });

                // Pending-Secret löschen
                await MfaPendingSecret.deleteMany({ userId });

                // Activity loggen
                await User.findByIdAndUpdate(userId, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'mfa:activated',
                            meta: {}
                        }
                    }
                });

                res.json({ ok: true, message: 'MFA erfolgreich aktiviert' });
            } catch (err) {
                console.error('POST /api/mfa/activate error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // POST /api/mfa/deactivate - MFA deaktivieren (erfordert TOTP-Verifikation)
    router.post('/deactivate',
        mfaVerifyLimiter,
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        body('code').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
        validate,
        async (req, res) => {
            try {
                const userId = req.user.sub;
                const { code } = req.body;

                const user = await User.findById(userId).select('mfaEnabled mfaSecret');
                if (!user) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
                if (!user.mfaEnabled || !user.mfaSecret) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // Secret entschlüsseln und Code verifizieren
                const secret = await decryptData(user.mfaSecret, userId);
                const isValid = authenticator.check(code, secret);

                if (!isValid) {
                    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
                    return sendJSONError(res, 400, 'Authentifizierung fehlgeschlagen');
                }

                // MFA deaktivieren
                await User.findByIdAndUpdate(userId, {
                    $set: { mfaEnabled: false },
                    $unset: { mfaSecret: 1 }
                });

                // Activity loggen (mit IP für Sicherheits-Audit)
                await User.findByIdAndUpdate(userId, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'mfa:deactivated',
                            meta: { ip: req.ip }
                        }
                    }
                });

                res.json({ ok: true, message: 'MFA erfolgreich deaktiviert' });
            } catch (err) {
                console.error('POST /api/mfa/deactivate error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    return router;
}