// middleware/mfaAuth.ts
import jwt from 'jsonwebtoken';
import { authenticator } from '@otplib/preset-v11';
// Cookie-Name für MFA-Pending-Token
const MFA_PENDING_COOKIE = 'mfa_pending_token';
export function generateMfaPendingToken(res, userId, email, secret) {
    const token = jwt.sign({
        sub: userId.toString(),
        email,
        purpose: 'mfa_pending',
    }, secret, { expiresIn: '5m' });
    res.cookie(MFA_PENDING_COOKIE, token, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'none',
        maxAge: 5 * 60 * 1000,
    });
    return token;
}
// Löschen
export function clearMfaPendingToken(res) {
    res.clearCookie(MFA_PENDING_COOKIE, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'none',
    });
}
// Verify middleware
export function verifyMfaPendingToken(secret) {
    return (req, res, next) => {
        const token = req.cookies[MFA_PENDING_COOKIE];
        if (!token || typeof token !== 'string') {
            res.status(401).json({
                error: 'Authentifizierung fehlgeschlagen',
                requiresMfaPending: true,
            });
            return;
        }
        try {
            const payload = jwt.verify(token, secret);
            if (payload.purpose !== 'mfa_pending' || !payload.sub || !payload.email) {
                res.status(401).json({
                    error: 'Authentifizierung fehlgeschlagen',
                });
                return;
            }
            req.mfaPending = {
                sub: payload.sub,
                email: payload.email,
            };
            next();
        }
        catch {
            res.status(401).json({
                error: 'Authentifizierung fehlgeschlagen',
                requiresMfaPending: true,
            });
        }
    };
}
// Code verifizieren
export function verifyTotpCode(code, secret) {
    return authenticator.check(code, secret);
}
// config
export function configureOtplib() {
    authenticator.options = {
        step: 30,
        window: 1,
    };
}
//# sourceMappingURL=mfaAuth.js.map