import jwt from 'jsonwebtoken';
import { authenticator } from '@otplib/preset-v11';

// Cookie-Name für MFA-Pending-Token
const MFA_PENDING_COOKIE = 'mfa_pending_token';

export function generateMfaPendingToken(res, userId, email, secret) {
    const token = jwt.sign(
        {
            sub: userId.toString(),
            email,
            purpose: 'mfa_pending'
        },
        secret,
        { expiresIn: '5m' } // 5 Minuten gültig
    );

    res.cookie(MFA_PENDING_COOKIE, token, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'None',
        maxAge: 5 * 60 * 1000 // 5 Minuten
    });

    return token;
}
// Löschen
export function clearMfaPendingToken(res) {
    res.clearCookie(MFA_PENDING_COOKIE, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'None'
    });
}

// Verify middleware
export function verifyMfaPendingToken(secret) {
    return (req, res, next) => {
        const token = req.cookies[MFA_PENDING_COOKIE];

        if (!token) {
            return res.status(401).json({
                error: 'Authentifizierung fehlgeschlagen',
                requiresMfaPending: true
            });
        }

        try {
            const payload = jwt.verify(token, secret);

            if (payload.purpose !== 'mfa_pending' || !payload.sub || !payload.email) {
                return res.status(401).json({
                    error: 'Authentifizierung fehlgeschlagen'
                });
            }

            req.mfaPending = {
                sub: payload.sub,
                email: payload.email
            };
            next();
        } catch (err) {
            return res.status(401).json({
                error: 'Authentifizierung fehlgeschlagen',
                requiresMfaPending: true
            });
        }
    };
}

// Code verifizieren
export function verifyTotpCode(code, secret) {
    // eingebaute Toleranz für Zeitversatz existiert schon
    return authenticator.check(code, secret);
}

// config
export function configureOtplib() {
    // Config: 30-Sekunden-Fenster, 1 Schritt Toleranz
    authenticator.options = {
        step: 30,
        window: 1
    };
}