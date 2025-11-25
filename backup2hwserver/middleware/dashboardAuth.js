// middleware/externalAuth.js
import jwt from 'jsonwebtoken';

function requireExternalAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Nicht autorisiert – Authentifizierung erforderlich' });
    }

    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role === 'admin') {
            req.authType = 'dashboard';
            return next();
        }

        if (decoded.sub) {
            req.authType = 'hw_user';
            return next();
        }

        // Token ist gültig, hat aber keine der erwarteten Rollen/Claims
        return res.status(403).json({ error: 'Verboten – Unzureichende Berechtigungen' });

    } catch (error) {
        console.error('Authentifizierungsfehler:', error.message);
        return res.status(401).json({ error: 'Nicht autorisiert – Ungültiger oder abgelaufener Token' });
    }
}

export { requireExternalAuth };