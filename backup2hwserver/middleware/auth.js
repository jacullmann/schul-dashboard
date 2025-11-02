// middleware/auth.js
import jwt from 'jsonwebtoken';
import { BannedUser, User } from '../models/index.js';
import { sendJSONError } from '../utils/helpers.js';
import config from '../config/index.js';

export function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return sendJSONError(res, 401, 'Kein Token');

    const token = header.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        (async () => {
            const isBanned = await BannedUser.findOne({ userId: decoded.sub }).lean();
            if (isBanned) {
                return sendJSONError(res, 401, 'Dein Account ist gesperrt.');
            }
            next();
        })();

    } catch {
        return sendJSONError(res, 401, 'Ungültiges Token');
    }
}

export function requireAuth(req, res, next) {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return sendJSONError(res, 401, 'Unauthorized');
    try {
        const payload = jwt.verify(token, config.JWT_SECRET);
        req.user = payload;

        (async () => {
            const isBanned = await BannedUser.findOne({ userId: payload.sub }).lean();
            if (isBanned) {
                return sendJSONError(res, 401, 'Dein Account ist gesperrt.');
            }
            next();
        })();

    } catch {
        return sendJSONError(res, 401, 'Unauthorized');
    }
}

export async function requireAdmin(req, res, next) {
    requireAuth(req, res, async () => {
        const user = await User.findById(req.user.sub);
        if (!user?.isAdmin) return sendJSONError(res, 403, 'Forbidden');
        next();
    });
}

export function tryAuth(req, res, next) {
    const header = req.headers.authorization;
    if (header) {
        const token = header.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded;
            } catch {
                req.user = null;
            }
        }
    }
    next();
}