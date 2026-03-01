import { Router } from 'express';
import { body, param } from 'express-validator';
import dayjs from 'dayjs';
import * as db from '../db/db.js';

export default function createAdminRoutes(deps) {
    const router = Router();
    const {
        supabase,
        cloudinary,
        geminiClient,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        validateCsrf,
        sendJSONError,
        validate,
        requireAdmin,
    } = deps;

    const adminAuth = [
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireAdmin,
    ];

    // DELETE /api/admin/cleanup/old-items
    router.delete('/cleanup/old-items',
        ...adminAuth,
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

                const oldItems = await db.findOldItems(supabase, ninetyDaysAgo);

                const publicIdsToDelete = [];
                const itemIds = oldItems.map(item => {
                    const images = item.images || [];
                    images.forEach(img => {
                        if (img.publicId) publicIdsToDelete.push(img.publicId);
                    });
                    return item.id;
                });

                if (publicIdsToDelete.length > 0) {
                    const batchSize = 100;
                    for (let i = 0; i < publicIdsToDelete.length; i += batchSize) {
                        const batch = publicIdsToDelete.slice(i, i + batchSize);
                        try {
                            await cloudinary.api.delete_resources(batch);
                        } catch (cloudErr) {
                            console.error('Cloudinary batch delete error:', cloudErr);
                        }
                    }
                }

                // Cascading deletes handle keep_checked and pinned_items
                await db.deleteItemsOlderThan(supabase, ninetyDaysAgo);

                await db.logActivity(supabase, req.user.sub, 'admin:cleanup:old_items', {
                    deletedCount: itemIds.length,
                    imagesDeleted: publicIdsToDelete.length,
                });

                res.json({
                    ok: true,
                    deletedItems: itemIds.length,
                    deletedImages: publicIdsToDelete.length,
                    message: `${itemIds.length} Einträge und ${publicIdsToDelete.length} Bilder gelöscht.`,
                });
            } catch (err) {
                console.error('DELETE /api/admin/cleanup/old-items error', err);
                sendJSONError(res, 500, 'Fehler beim Bereinigen alter Einträge');
            }
        }
    );

    // POST /api/admin/security-report
    router.post('/security-report',
        ...adminAuth,
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const data = await db.listSecurityEvents(supabase, 500);
                if (!data || data.length === 0) return sendJSONError(res, 404, 'Keine Security-Events gefunden.');

                const logsJsonString = JSON.stringify(data, null, 2);
                const truncatedLogs = logsJsonString.length > 50000
                    ? logsJsonString.substring(0, 50000) + '\n... (Daten zur Anzeige gekürzt)'
                    : logsJsonString;

                const prompt = `
Du bist ein leitender Cyber-Sicherheitsanalyst für eine Web-Anwendung.
Deine Aufgabe ist es, einen Sicherheitsbericht basierend auf den folgenden Security-Events (Tabelle 'security_events') zu erstellen.

Die Logs enthalten folgende Felder:
- 'event_type': Art des Events (z.B. 'app_gate_login', 'app_gate_logout')
- 'event_status': Status des Events ('success', 'failure')
- 'ip_address': IP-Adresse des Clients
- 'user_agent': Browser/Client Information
- 'metadata': Zusätzliche Event-spezifische Daten (JSON)
- 'created_at': Zeitstempel des Events

Event-Typen:
- 'app_gate_login': Authentifizierungsversuch am App-Gate (success = erfolgreich, failure = fehlgeschlagen)
- 'app_gate_logout': Logout eines authentifizierten Nutzers (normalerweise immer success)

Hier sind die Rohdaten (möglicherweise gekürzt):
${truncatedLogs}

---
AUFGABE:
Erstelle einen detaillierten, aber prägnanten Sicherheitsbericht auf Deutsch.
Struktur:
1.  **Zusammenfassung:** Kurze Übersicht.
2.  **Trendanalyse:** Gibt es Muster?
3.  **Auffällige Aktivitäten & IPs:** Identifiziere spezifische Bedrohungen.
4.  **Empfohlene Maßnahmen:** Konkrete, priorisierte Tipps.
5.  **Sicherheitswarnungen:** (Nur falls akute Bedrohungen erkennbar sind).

Formatiere die gesamte Ausgabe als sauberes Markdown.
Hinweis: Es handelt sich bei der Authentifizierung nicht um eine klassische mit Benutzerkonten, sondern um eine äußere Authentifizierung.
Sei weder zu lasch, noch sieh jede Abfolge von Fehlschlägen als Angriff.
`;

                if (!geminiClient) {
                    return sendJSONError(res, 500, 'Gemini API Key ist ungültig oder nicht initialisiert.');
                }

                const response = await geminiClient.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                res.json({ ok: true, report: response.text });
            } catch (err) {
                console.error('Fehler beim Generieren des Sicherheitsberichts:', err);
                if (err.message?.includes('API key not valid')) {
                    return sendJSONError(res, 500, 'Gemini API Key ist ungültig.');
                }
                sendJSONError(res, 500, 'Fehler bei der Kommunikation mit der Gemini API.');
            }
        }
    );

    // GET /api/admin/stats
    router.get('/stats',
        ...adminAuth,
        async (req, res) => {
            try {
                const [
                    userCount, itemCount, bannedCount,
                    reportCountUnprocessed, reportCountTotal,
                    sorgeCountUnprocessed, sorgeCountTotal,
                    itemsByType, verifiedUsers, adminCount, oldItemsCount,
                ] = await Promise.all([
                    db.countUsers(supabase),
                    db.countItems(supabase),
                    db.countBanned(supabase),
                    db.countReports(supabase, { processed: false }),
                    db.countReports(supabase),
                    db.countSorgen(supabase, { processed: false }),
                    db.countSorgen(supabase),
                    db.getItemsByTypeCount(supabase),
                    db.countUsers(supabase, { email_verified: true }),
                    db.countUsers(supabase, { is_admin: true }),
                    db.countItemsOlderThan(supabase, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
                ]);

                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                const [newUsersThisWeek, newItemsThisWeek, topCreators] = await Promise.all([
                    db.countUsersSince(supabase, sevenDaysAgo),
                    db.countItemsSince(supabase, sevenDaysAgo),
                    db.getTopCreators(supabase, 5),
                ]);

                res.json({
                    userCount,
                    itemCount,
                    reportCount: reportCountUnprocessed,
                    reportCountTotal,
                    reportCountProcessed: reportCountTotal - reportCountUnprocessed,
                    bannedCount,
                    sorgeCount: sorgeCountUnprocessed,
                    sorgeCountTotal,
                    sorgeCountProcessed: sorgeCountTotal - sorgeCountUnprocessed,
                    itemsByType,
                    verifiedUsers,
                    unverifiedUsers: userCount - verifiedUsers,
                    adminCount,
                    oldItemsCount,
                    newUsersThisWeek,
                    newItemsThisWeek,
                    topCreators,
                });
            } catch (err) {
                console.error('GET /api/admin/stats error', err);
                sendJSONError(res, 500, 'Serverfehler beim Laden der Statistiken');
            }
        }
    );

    // GET /api/admin/timetable/subs
    router.get('/timetable/subs',
        ...adminAuth,
        async (req, res) => {
            try {
                const subs = await db.listTimetableSubs(supabase);
                res.json(subs);
            } catch (err) {
                console.error('GET /api/admin/timetable/subs error', err);
                sendJSONError(res, 500, 'Serverfehler beim Laden der Substitutions');
            }
        }
    );

    // POST /api/admin/timetable/subs
    router.post('/timetable/subs',
        ...adminAuth,
        validateCsrf(csrfSecret),
        [
            body('lessonId').isInt(),
            body('day').optional().isString(),
            body('slot').optional().isInt(),
            body('duration').optional().isInt(),
            body('subject').optional().isString(),
            body('subject_abbr').optional().isString(),
            body('teacher').optional().isString(),
            body('room').optional().isString(),
            body('cancelled').optional().isBoolean(),
            body('hide').optional().isBoolean(),
        ],
        validate,
        async (req, res) => {
            try {
                const newSub = await db.createTimetableSub(supabase, req.body);
                await db.logActivity(supabase, req.user.sub, 'timetable:sub:create', { lessonId: req.body.lessonId });
                res.status(201).json(newSub);
            } catch (err) {
                console.error('POST /api/admin/timetable/subs error', err);
                sendJSONError(res, 500, 'Serverfehler beim Speichern der Substitution');
            }
        }
    );

    // DELETE /api/admin/timetable/subs/:id
    router.delete('/timetable/subs/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const deleted = await db.deleteTimetableSub(supabase, req.params.id);
                await db.logActivity(supabase, req.user.sub, 'timetable:sub:delete', { lessonId: deleted.lesson_id });
                res.json({ ok: true, message: 'Substitution gelöscht' });
            } catch (err) {
                console.error('DELETE /api/admin/timetable/subs/:id error', err);
                sendJSONError(res, 500, 'Serverfehler beim Löschen der Substitution');
            }
        }
    );

    // PATCH /api/admin/reports/:id/processed
    router.patch('/reports/:id/processed',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        body('processed').isBoolean(),
        validate,
        async (req, res) => {
            try {
                const { processed } = req.body;
                const report = await db.updateReport(supabase, req.params.id, {
                    processed,
                    processed_at: processed ? new Date().toISOString() : null,
                    processed_by: processed ? req.user.sub : null,
                });

                await db.logActivity(supabase, req.user.sub,
                    processed ? 'admin:report:mark_processed' : 'admin:report:mark_unprocessed',
                    { reportId: req.params.id }
                );

                res.json({ ok: true, processed: report.processed, processedAt: report.processed_at });
            } catch (err) {
                console.error('PATCH /api/admin/reports/:id/processed error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // GET /api/admin/users
    router.get('/users',
        ...adminAuth,
        async (req, res) => {
            try {
                const users = await db.listUsers(supabase, { select: 'id, email, is_admin, created_at, last_login_at' });
                const result = await Promise.all(users.map(async (u) => {
                    const activity = await db.getUserActivity(supabase, u.id, { limit: 20 });
                    return {
                        id: u.id, email: u.email, isAdmin: u.is_admin,
                        createdAt: u.created_at, lastLoginAt: u.last_login_at,
                        activity: activity.map(a => ({ at: a.created_at, type: a.type, meta: a.meta })),
                    };
                }));
                res.json(result);
            } catch (err) {
                console.error('GET /api/admin/users error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/admin/reports/:id
    router.delete('/reports/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                await db.deleteReport(supabase, req.params.id);
                await db.logActivity(supabase, req.user.sub, 'admin:report:delete', { reportId: req.params.id });
                res.json({ ok: true, message: 'Meldung erfolgreich gelöscht' });
            } catch (err) {
                console.error('DELETE /api/admin/reports/:id error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // DELETE /api/admin/users/:id
    router.delete('/users/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const target = await db.findUserById(supabase, req.params.id, 'id, is_admin');
                if (!target) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
                if (target.is_admin) return sendJSONError(res, 403, 'Admins können nicht gelöscht werden');
                // CASCADE handles dependent records
                await db.deleteUser(supabase, req.params.id);
                res.json({ ok: true });
            } catch (err) {
                console.error('DELETE /api/admin/users/:id error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // PATCH /api/admin/users/:id
    router.patch('/users/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        body('isAdmin').isBoolean(),
        validate,
        async (req, res) => {
            try {
                await db.updateUser(supabase, req.params.id, { is_admin: !!req.body.isAdmin });
                res.json({ ok: true });
            } catch (err) {
                console.error('PATCH /api/admin/users/:id error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/admin/subjects
    router.post('/subjects',
        ...adminAuth,
        validateCsrf(csrfSecret),
        body('name').isString().isLength({ min: 2, max: 50 }),
        validate,
        async (req, res) => {
            try {
                await db.upsertSubject(supabase, req.body.name);
                res.status(201).json({ ok: true });
            } catch (err) {
                console.error('POST /api/admin/subjects error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/admin/subjects/:name
    router.delete('/subjects/:name',
        ...adminAuth,
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                await db.deleteSubject(supabase, req.params.name);
                res.json({ ok: true });
            } catch (err) {
                console.error('DELETE /api/admin/subjects/:name error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // GET /api/admin/all-users
    router.get('/all-users',
        ...adminAuth,
        async (req, res) => {
            try {
                const users = await db.listUsers(supabase, {
                    select: 'id, email, is_admin, email_verified, created_at, last_login_at, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater, done_setup',
                });
                const bannedIds = new Set(await db.listBannedUserIds(supabase));

                const result = users.map(u => ({
                    id: u.id,
                    email: u.email,
                    isAdmin: u.is_admin,
                    emailVerified: u.email_verified,
                    createdAt: u.created_at,
                    lastLoginAt: u.last_login_at,
                    enrKurs: u.enr_kurs,
                    wpuKurs1: u.wpu_kurs_1,
                    wpuKurs2: u.wpu_kurs_2,
                    theater: u.theater,
                    doneSetup: u.done_setup,
                    isBanned: bannedIds.has(u.id),
                }));
                res.json(result);
            } catch (err) {
                console.error('GET /api/admin/all-users error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // GET /api/admin/users/:id/activity
    router.get('/users/:id/activity',
        ...adminAuth,
        async (req, res) => {
            try {
                const activity = await db.getUserActivity(supabase, req.params.id, { limit: 200 });
                res.json(activity.map(a => ({ at: a.created_at, type: a.type, meta: a.meta })));
            } catch (err) {
                console.error('GET /api/admin/users/:id/activity error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/admin/users/:id/ban
    router.post('/users/:id/ban',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const target = await db.findUserById(supabase, req.params.id, 'id, is_admin');
                if (!target) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
                if (target.is_admin) return sendJSONError(res, 400, 'Du kannst keine Admins bannen.');
                await db.banUser(supabase, target.id);
                await db.logActivity(supabase, req.user.sub, 'admin:ban:user', { targetUserId: target.id });
                res.json({ ok: true, isBanned: true });
            } catch (err) {
                console.error('POST /api/admin/users/:id/ban error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/admin/users/:id/ban
    router.delete('/users/:id/ban',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                await db.unbanUser(supabase, req.params.id);
                await db.logActivity(supabase, req.user.sub, 'admin:unban:user', { targetUserId: req.params.id });
                res.json({ ok: true, isBanned: false });
            } catch (err) {
                console.error('DELETE /api/admin/users/:id/ban error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // GET /api/admin/reports
    router.get('/reports',
        ...adminAuth,
        async (req, res) => {
            try {
                const reports = await db.listReports(supabase);
                res.json(reports);
            } catch (err) {
                console.error('GET /api/admin/reports error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/admin/users/:id/activity/prune
    router.delete('/users/:id/activity/prune',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                await db.pruneActivity(supabase, req.params.id, 30);
                await db.logActivity(supabase, req.user.sub, 'admin:prune_logs', { targetUserId: req.params.id });
                res.json({ ok: true, message: 'Logs bereinigt.' });
            } catch (err) {
                console.error('Prune logs error', err);
                sendJSONError(res, 500, 'Fehler beim Bereinigen');
            }
        }
    );

    // GET /api/admin/sorgen
    router.get('/sorgen',
        ...adminAuth,
        async (req, res) => {
            try {
                const sorgen = await db.listSorgen(supabase);
                res.json(sorgen);
            } catch (err) {
                console.error('GET /api/admin/sorgen error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/admin/sorgen/:id
    router.delete('/sorgen/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                await db.deleteSorge(supabase, req.params.id);
                res.json({ ok: true, message: 'Sorgen-Eintrag erfolgreich gelöscht' });
            } catch (err) {
                console.error('DELETE /api/admin/sorgen/:id error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    // PATCH /api/admin/sorgen/:id/processed
    router.patch('/sorgen/:id/processed',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        body('processed').isBoolean(),
        validate,
        async (req, res) => {
            try {
                const { processed } = req.body;
                const sorge = await db.updateSorge(supabase, req.params.id, {
                    processed,
                    processed_at: processed ? new Date().toISOString() : null,
                    processed_by: processed ? req.user.sub : null,
                });

                await db.logActivity(supabase, req.user.sub,
                    processed ? 'admin:sorge:mark_processed' : 'admin:sorge:mark_unprocessed',
                    { sorgeId: req.params.id }
                );

                res.json({ ok: true, processed: sorge.processed, processedAt: sorge.processed_at });
            } catch (err) {
                console.error('PATCH /api/admin/sorgen/:id/processed error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    return router;
}