// middleware/externalAuth.js
import jwt from 'jsonwebtoken';
function requireExternalAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';

    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role === 'admin') {
                req.authType = 'dashboard';
                return next();
            }
        } catch (error) {
        }
    }

    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.sub) {
                req.authType = 'hw_user';
                return next();
            }
        } catch (error) {
        }
    }

    return res.status(401).json({ error: 'Nicht autorisiert ––– Authentifizierung erforderlich' });
}

export { requireExternalAuth };