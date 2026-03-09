// routes/doc.ts
import { Router } from 'express';
import sanitizeHtml from 'sanitize-html';
import jwt from 'jsonwebtoken';
import * as db from '../db/db.js';
let docState = {
    content: '',
    version: 0,
    lastEditedBy: null,
    lastEditedAt: null,
};
const connectedAdmins = new Map();
const SANITIZE_OPTIONS = {
    allowedTags: [
        'h1',
        'h2',
        'h3',
        'h4',
        'p',
        'ul',
        'ol',
        'li',
        'strong',
        'em',
        'u',
        's',
        'br',
        'span',
        'div',
        'input',
    ],
    allowedAttributes: {
        '*': ['style', 'class', 'data-*'],
        input: ['type', 'checked', 'disabled'],
        span: ['style'],
    },
    allowedStyles: {
        '*': {
            color: [/.*/],
            'background-color': [/.*/],
            'font-weight': [/.*/],
            'font-style': [/.*/],
            'text-decoration': [/.*/],
        },
    },
};
async function loadDocFromDb(supabase) {
    try {
        const data = await db.getSharedDoc(supabase);
        if (data) {
            docState = {
                content: data.content ?? '',
                version: data.version ?? 0,
                lastEditedBy: data.last_edited_by,
                lastEditedAt: data.last_edited_at,
            };
        }
        else {
            await db.upsertSharedDoc(supabase, {
                content: '',
                version: 0,
                lastEditedBy: null,
                lastEditedAt: null,
            });
        }
    }
    catch (err) {
        console.error('[Doc] DB load error:', err);
    }
}
async function persistDocToDb(supabase) {
    try {
        await db.upsertSharedDoc(supabase, docState);
    }
    catch (err) {
        console.error('[Doc] DB write error:', err);
    }
}
export function registerDocSocket(io, supabase, deps) {
    const { authSecret } = deps;
    loadDocFromDb(supabase);
    let persistTimer = null;
    function startPersistTimer() {
        if (persistTimer)
            return;
        persistTimer = setInterval(async () => {
            await persistDocToDb(supabase);
            if (connectedAdmins.size === 0) {
                clearInterval(persistTimer);
                persistTimer = null;
            }
        }, 30_000);
    }
    const docNs = io.of('/doc');
    docNs.use(async (socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie || '';
            const cookieMap = Object.fromEntries(cookieHeader.split(';').map((c) => {
                const [k, ...v] = c.trim().split('=');
                return [k, decodeURIComponent(v.join('='))];
            }));
            const userToken = cookieMap['auth_token'];
            if (!userToken)
                return next(new Error('AUTH_REQUIRED'));
            const payload = jwt.verify(userToken, authSecret);
            if (!payload?.sub || !payload?.email)
                return next(new Error('AUTH_INVALID'));
            // Use globalRole from lean JWT
            if (payload.gRole !== 'superadmin')
                return next(new Error('AUTH_FORBIDDEN'));
            const banned = await db.isBanned(supabase, payload.sub);
            if (banned)
                return next(new Error('AUTH_BANNED'));
            socket.data.userId = payload.sub;
            socket.data.email = payload.email;
            next();
        }
        catch {
            next(new Error('AUTH_INVALID'));
        }
    });
    docNs.on('connection', (socket) => {
        const { email, userId } = socket.data;
        connectedAdmins.set(socket.id, { email, userId });
        startPersistTimer();
        const getOnlineList = () => Array.from(connectedAdmins.values()).map((a) => a.email);
        socket.emit('doc:init', { ...docState, onlineAdmins: getOnlineList() });
        socket.broadcast.emit('doc:admins-update', {
            onlineAdmins: getOnlineList(),
        });
        socket.on('doc:update', (payload) => {
            const p = payload;
            if (typeof p?.content !== 'string' ||
                typeof p?.clientVersion !== 'number')
                return;
            if (p.clientVersion < docState.version) {
                socket.emit('doc:conflict', {
                    serverContent: docState.content,
                    serverVersion: docState.version,
                    lastEditedBy: docState.lastEditedBy,
                });
                return;
            }
            docState.content = sanitizeHtml(p.content, SANITIZE_OPTIONS);
            docState.version += 1;
            docState.lastEditedBy = email;
            docState.lastEditedAt = new Date().toISOString();
            socket.broadcast.emit('doc:update', {
                content: docState.content,
                version: docState.version,
                editedBy: email,
            });
            socket.emit('doc:ack', { version: docState.version });
        });
        socket.on('doc:cursor', (p) => socket.broadcast.emit('doc:cursor', {
            email,
            ...p,
        }));
        socket.on('disconnect', async () => {
            connectedAdmins.delete(socket.id);
            docNs.emit('doc:admins-update', { onlineAdmins: getOnlineList() });
            if (connectedAdmins.size === 0)
                await persistDocToDb(supabase);
        });
    });
}
export default function createDocRoutes(deps) {
    const router = Router();
    const { supabase, authSecret, requireAuth, validateCsrf, sendJSONError } = deps;
    const sa = [requireAuth(authSecret, supabase, 'superadmin')];
    router.get('/', ...sa, async (_req, res) => {
        res.json(docState);
    });
    router.post('/save', ...sa, validateCsrf(), async (_req, res) => {
        try {
            await persistDocToDb(supabase);
            res.json({ ok: true, version: docState.version });
        }
        catch {
            sendJSONError(res, 500, 'Fehler beim Speichern');
        }
    });
    router.get('/history', ...sa, async (_req, res) => {
        try {
            const data = await db.getSharedDoc(supabase);
            res.json(data ?? { content: '', version: 0 });
        }
        catch {
            sendJSONError(res, 500, 'Fehler beim Laden');
        }
    });
    return router;
}
//# sourceMappingURL=doc.js.map