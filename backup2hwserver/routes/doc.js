import { Router } from 'express';
import sanitizeHtml from 'sanitize-html';
import jwt from 'jsonwebtoken';

// Doc state in memory
let docState = {
    content: '',        // aktueller HTML-Content
    version: 0,         // Monoton steigender Versions-Zähler (für Conflict-Detection)
    lastEditedBy: null, // E-Mail des letzten Bearbeiters
    lastEditedAt: null, // Timestamp des letzten Edits
};

const connectedAdmins = new Map(); // socketId -> { email, userId }

// Erlaubte Html tags
const SANITIZE_OPTIONS = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li',
        'strong', 'em', 'u', 's', 'br', 'span', 'div',
        'input'  // für Checkboxen
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
        }
    }
};

// Lädt neuste Daten aus supabase
async function loadDocFromDb(supabase) {
    try {
        const { data, error } = await supabase
            .from('admin_shared_doc')
            .select('content, version, last_edited_by, last_edited_at')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            console.error('[Doc] Fehler beim Laden aus DB:', error.message);
            return;
        }

        if (data) {
            docState.content = data.content ?? '';
            docState.version = data.version ?? 0;
            docState.lastEditedBy = data.last_edited_by ?? null;
            docState.lastEditedAt = data.last_edited_at ?? null;
            console.log(`[Doc] Dokument aus DB geladen (Version ${docState.version})`);
        } else {
            // Zeile existiert noch nicht -> anlegen
            await supabase.from('admin_shared_doc').insert({
                id: 1,
                content: '',
                version: 0,
                last_edited_by: null,
                last_edited_at: null,
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
        const { error } = await supabase
            .from('admin_shared_doc')
            .upsert({
                id: 1,
                content: docState.content,
                version: docState.version,
                last_edited_by: docState.lastEditedBy,
                last_edited_at: docState.lastEditedAt,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (error) {
            console.error('[Doc] Fehler beim Persistieren:', error.message);
        } else {
            console.log(`[Doc] In DB gespeichert (Version ${docState.version})`);
        }
    } catch (err) {
        console.error('[Doc] Unerwarteter Fehler beim DB-Write:', err);
    }
}

// Socket io namespace handler
export function registerDocSocket(io, supabase, deps) {
    const { requireUser, requireAdmin, userSecret } = deps;

    // Letzten Stand bei server stand einmalig aus db laden
    loadDocFromDb(supabase);

    // Solange jemand online -> Alle 30 sekunden in db speichern
    const PERSIST_INTERVAL_MS = 30_000;
    let persistTimer = null;

    function startPersistTimer() {
        if (persistTimer) return; // läuft schon
        persistTimer = setInterval(async () => {
            if (connectedAdmins.size === 0) {
                // Niemand mehr online -> letzten Stand speichern und Timer stoppen
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

    // Socket io namespace: /doc
    const docNs = io.of('/doc');

    // Middleware: JWT aus Cookie validieren (gleiche Logik wie requireUser, aber für Sockets)
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
            if (!userToken) {
                return next(new Error('AUTH_REQUIRED'));
            }

            // Token verifizieren
            const payload = jwt.verify(userToken, userSecret);

            if (!payload?.sub || !payload?.email) {
                return next(new Error('AUTH_INVALID'));
            }

            // Aus DB isAdmin prüfen
            const { User, BannedUser } = deps.models;
            const user = await User.findById(payload.sub).lean();
            if (!user) return next(new Error('AUTH_NOT_FOUND'));
            if (!user.isAdmin) return next(new Error('AUTH_FORBIDDEN'));

            const banned = await BannedUser.findOne({ userId: payload.sub }).lean();
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

        // Admin registrieren
        connectedAdmins.set(socket.id, { email, userId });

        // Persistenz-Timer starten falls er noch nicht läuft
        startPersistTimer();

        // Neuen Client mit aktuellem Stand + Online-Liste versorgen
        socket.emit('doc:init', {
            content: docState.content,
            version: docState.version,
            lastEditedBy: docState.lastEditedBy,
            lastEditedAt: docState.lastEditedAt,
            onlineAdmins: getOnlineAdminList(),
        });

        // Alle anderen über neuen Online-Admin informieren
        socket.broadcast.emit('doc:admins-update', {
            onlineAdmins: getOnlineAdminList(),
        });


        // Event: doc:update
        socket.on('doc:update', (payload) => {
            // Payload-Validierung
            if (typeof payload?.content !== 'string') return;
            if (typeof payload?.clientVersion !== 'number') return;

            // Konflikt-Check:
            // Wenn der Client auf einer alten Version basiert, bekommt er den
            // aktuellen Stand zurück
            if (payload.clientVersion < docState.version) {
                // Client ist veraltet -> ihm den aktuellen Stand schicken
                socket.emit('doc:conflict', {
                    serverContent: docState.content,
                    serverVersion: docState.version,
                    lastEditedBy: docState.lastEditedBy,
                });
                return;
            }

            // HTML sanitizen bevor er an den state übergeben wird
            const sanitized = sanitizeHtml(payload.content, SANITIZE_OPTIONS);

            docState.content = sanitized;
            docState.version += 1;
            docState.lastEditedBy = email;
            docState.lastEditedAt = new Date().toISOString();

            // Allen anderen Clients (nicht dem sender) das Update schicken
            socket.broadcast.emit('doc:update', {
                content: docState.content,
                version: docState.version,
                editedBy: email,
            });

            // Sender-Bestätigung mit aktueller Version
            socket.emit('doc:ack', {
                version: docState.version,
            });
        });

        // Event: doc:cursor
        socket.on('doc:cursor', (payload) => {
            socket.broadcast.emit('doc:cursor', {
                email,
                ...payload,
            });
        });

        // Disconnect
        socket.on('disconnect', async () => {
            console.log(`[Doc] Admin getrennt: ${email} (${socket.id})`);
            connectedAdmins.delete(socket.id);

            // Alle über aktualisierte Online-Liste informieren
            docNs.emit('doc:admins-update', {
                onlineAdmins: getOnlineAdminList(),
            });

            // Wenn letzter Admin -> sofort persistieren
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
        requireAppGate,
        requireUser,
        requireAdmin,
        validateCsrf,
        sendJSONError,
        appGateSecret,
        userSecret,
        csrfSecret,
        models,
    } = deps;
    const { User, BannedUser } = models;

    // GET /api/doc — Aktuellen Stand holen (Fallback falls Socket nicht verfügbar)
    router.get('/',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
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

    // POST /api/doc/save — Manuelles Speichern in DB anstossen
    router.post('/save',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
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

    // GET /api/doc/history — Letzten gespeicherten Stand aus DB holen
    router.get('/history',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin,
        async (req, res) => {
            try {
                const { data, error } = await supabase
                    .from('admin_shared_doc')
                    .select('content, version, last_edited_by, last_edited_at, updated_at')
                    .eq('id', 1)
                    .maybeSingle();

                if (error) throw error;
                res.json(data ?? { content: '', version: 0 });
            } catch (err) {
                console.error('[Doc] GET /history Fehler:', err);
                sendJSONError(res, 500, 'Fehler beim Laden der History');
            }
        }
    );

    return router;
}