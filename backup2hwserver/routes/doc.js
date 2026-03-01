import { Router } from 'express';
import sanitizeHtml from 'sanitize-html';
import jwt from 'jsonwebtoken';
import * as db from '../db/db.js';

// Doc state in memory
let docState = {
    content: '',
    version: 0,
    lastEditedBy: null,
    lastEditedAt: null,
};

const connectedAdmins = new Map(); // socketId -> { email, userId }

// Erlaubte HTML tags
const SANITIZE_OPTIONS = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li',
        'strong', 'em', 'u', 's', 'br', 'span', 'div',
        'input',
    ],
    allowedAttributes: {
        '*': ['style', 'class', 'data-*'],
        'input': ['type', 'checked', 'disabled'],
        'span': ['style'],
    },
    allowedStyles: {
        '*': {
            'color': [/.*/],
            'background-color': [/.*/],
            'font-weight': [/.*/],
            'font-style': [/.*/],
            'text-decoration': [/.*/],
        },
    },
};

// Lädt neusten Stand aus Supabase
async function loadDocFromDb(supabase) {
    try {
        const data = await db.getSharedDoc(supabase);

        if (data) {
            docState.content = data.content ?? '';
            docState.version = data.version ?? 0;
            docState.lastEditedBy = data.last_edited_by ?? null;
            docState.lastEditedAt = data.last_edited_at ?? null;
            console.log(`[Doc] Dokument aus DB geladen (Version ${docState.version})`);
        } else {
            await db.upsertSharedDoc(supabase, {
                content: '',
                version: 0,
                lastEditedBy: null,
                lastEditedAt: null,
            });
            console.log('[Doc] Initiale DB-Zeile angelegt');
        }
    } catch (err) {
        console.error('[Doc] Unerwarteter Fehler beim DB-Load:', err);
    }
}

// Schreibt aktuellen Stand in Supabase
async function persistDocToDb(supabase) {
    try {
        await db.upsertSharedDoc(supabase, {
            content: docState.content,
            version: docState.version,
            lastEditedBy: docState.lastEditedBy,
            lastEditedAt: docState.lastEditedAt,
        });
        console.log(`[Doc] In DB gespeichert (Version ${docState.version})`);
    } catch (err) {
        console.error('[Doc] Unerwarteter Fehler beim DB-Write:', err);
    }
}

// Socket.IO namespace handler
export function registerDocSocket(io, supabase, deps) {
    const { userSecret } = deps;

    // Letzten Stand bei Serverstart einmalig aus DB laden
    loadDocFromDb(supabase);

    const PERSIST_INTERVAL_MS = 30_000;
    let persistTimer = null;

    function startPersistTimer() {
        if (persistTimer) return;
        persistTimer = setInterval(async () => {
            if (connectedAdmins.size === 0) {
                await persistDocToDb(supabase);
                clearInterval(persistTimer);
                persistTimer = null;
                console.log('[Doc] Alle Admins offline – Persistenz-Timer gestoppt');
            } else {
                await persistDocToDb(supabase);
            }
        }, PERSIST_INTERVAL_MS);
        console.log('[Doc] Persistenz-Timer gestartet');
    }

    const docNs = io.of('/doc');

    // Middleware: JWT aus Cookie validieren (Supabase-basiert)
    docNs.use(async (socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie || '';
            const cookieMap = Object.fromEntries(
                cookieHeader.split(';').map(c => {
                    const [k, ...v] = c.trim().split('=');
                    return [k, decodeURIComponent(v.join('='))];
                })
            );

            const userToken = cookieMap['user_token'];
            if (!userToken) return next(new Error('AUTH_REQUIRED'));

            const payload = jwt.verify(userToken, userSecret);
            if (!payload?.sub || !payload?.email) return next(new Error('AUTH_INVALID'));

            // Check user exists, is admin, not banned — via Supabase
            const user = await db.findUserById(supabase, payload.sub, 'id, user_roles(roles(name))');
            if (!user) return next(new Error('AUTH_NOT_FOUND'));
            if (user.user_roles?.[0]?.roles?.name !== 'superadmin') return next(new Error('AUTH_FORBIDDEN'));

            const banned = await db.isBanned(supabase, payload.sub);
            if (banned) return next(new Error('AUTH_BANNED'));

            socket.data.userId = payload.sub;
            socket.data.email = payload.email;
            next();
        } catch (err) {
            next(new Error('AUTH_INVALID'));
        }
    });

    docNs.on('connection', (socket) => {
        const { email, userId } = socket.data;
        console.log(`[Doc] Admin verbunden: ${email} (${socket.id})`);

        connectedAdmins.set(socket.id, { email, userId });
        startPersistTimer();

        socket.emit('doc:init', {
            content: docState.content,
            version: docState.version,
            lastEditedBy: docState.lastEditedBy,
            lastEditedAt: docState.lastEditedAt,
            onlineAdmins: getOnlineAdminList(),
        });

        socket.broadcast.emit('doc:admins-update', {
            onlineAdmins: getOnlineAdminList(),
        });

        socket.on('doc:update', (payload) => {
            if (typeof payload?.content !== 'string') return;
            if (typeof payload?.clientVersion !== 'number') return;

            if (payload.clientVersion < docState.version) {
                socket.emit('doc:conflict', {
                    serverContent: docState.content,
                    serverVersion: docState.version,
                    lastEditedBy: docState.lastEditedBy,
                });
                return;
            }

            const sanitized = sanitizeHtml(payload.content, SANITIZE_OPTIONS);

            docState.content = sanitized;
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

        socket.on('doc:cursor', (payload) => {
            socket.broadcast.emit('doc:cursor', { email, ...payload });
        });

        socket.on('disconnect', async () => {
            console.log(`[Doc] Admin getrennt: ${email} (${socket.id})`);
            connectedAdmins.delete(socket.id);

            docNs.emit('doc:admins-update', {
                onlineAdmins: getOnlineAdminList(),
            });

            if (connectedAdmins.size === 0) {
                await persistDocToDb(supabase);
                console.log('[Doc] Letzter Admin offline → sofort persistiert');
            }
        });
    });

    function getOnlineAdminList() {
        return Array.from(connectedAdmins.values()).map(a => a.email);
    }
}

// REST-Routen: /api/doc
export default function createDocRoutes(deps) {
    const router = Router();
    const {
        supabase,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        requireAdmin,
        validateCsrf,
        sendJSONError,
    } = deps;

    // GET /api/doc
    router.get('/',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireAdmin,
        async (req, res) => {
            try {
                res.json({
                    content: docState.content,
                    version: docState.version,
                    lastEditedBy: docState.lastEditedBy,
                    lastEditedAt: docState.lastEditedAt,
                });
            } catch (err) {
                console.error('[Doc] GET / Fehler:', err);
                sendJSONError(res, 500, 'Fehler beim Laden des Dokuments');
            }
        }
    );

    // POST /api/doc/save
    router.post('/save',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireAdmin,
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                await persistDocToDb(supabase);
                res.json({ ok: true, version: docState.version });
            } catch (err) {
                console.error('[Doc] POST /save Fehler:', err);
                sendJSONError(res, 500, 'Fehler beim Speichern');
            }
        }
    );

    // GET /api/doc/history
    router.get('/history',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireAdmin,
        async (req, res) => {
            try {
                const data = await db.getSharedDoc(supabase);
                res.json(data ?? { content: '', version: 0 });
            } catch (err) {
                console.error('[Doc] GET /history Fehler:', err);
                sendJSONError(res, 500, 'Fehler beim Laden der History');
            }
        }
    );

    return router;
}