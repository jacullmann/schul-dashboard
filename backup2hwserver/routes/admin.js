import { Router } from 'express';
import { body, param } from 'express-validator';
import dayjs from 'dayjs';
import * as db from '../db/db.js';

export default function createAdminRoutes(deps) {
    const router = Router();
    const {
        supabase,
        cloudinary,
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
                    supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role_id', 1).then(({ count }) => count || 0),
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
                res.json(subs.map(s => ({
                    id: s.id,
                    lessonId: s.lesson_id,
                    day: s.day,
                    slot: s.slot,
                    duration: s.duration,
                    subject: s.subject,
                    subject_abbr: s.subject_abbr,
                    teacher: s.teacher,
                    room: s.room,
                    cancelled: s.cancelled,
                    hide: s.hide,
                    createdAt: s.created_at,
                })));
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
            body('lessonId').isUUID(),
            body('day').optional().isString(),
            body('slot').optional().isInt(),
            body('duration').optional().isInt(),
            body('subject').optional().isString(),
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
                const users = await db.listUsers(supabase, { select: 'id, email, user_roles(roles(name)), created_at, last_login_at' });
                const result = await Promise.all(users.map(async (u) => {
                    const activity = await db.getUserActivity(supabase, u.id, { limit: 20 });
                    return {
                        id: u.id, email: u.email, role: u.user_roles?.[0]?.roles?.name || 'user',
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
                const target = await db.findUserById(supabase, req.params.id, 'id, user_roles(roles(name))');
                if (!target) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
                if (target.user_roles?.[0]?.roles?.name === 'superadmin') return sendJSONError(res, 403, 'Admins können nicht gelöscht werden');
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
        body('role').isString(),
        validate,
        async (req, res) => {
            try {
                if (req.body.role === 'superadmin') {
                    await supabase.from('user_roles').upsert({ user_id: req.params.id, role_id: 1 });
                } else {
                    await supabase.from('user_roles').delete().eq('user_id', req.params.id).eq('role_id', 1);
                }
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
                    select: 'id, email, user_roles(roles(name)), email_verified, created_at, last_login_at, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater, done_setup',
                });
                const bannedIds = new Set(await db.listBannedUserIds(supabase));

                const result = users.map(u => ({
                    id: u.id,
                    email: u.email,
                    role: u.user_roles?.[0]?.roles?.name || 'user',
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
                const target = await db.findUserById(supabase, req.params.id, 'id, user_roles(roles(name))');
                if (!target) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
                if (target.user_roles?.[0]?.roles?.name === 'superadmin') return sendJSONError(res, 400, 'Du kannst keine Admins bannen.');
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
                res.json(reports.map(r => ({
                    id: r.id,
                    itemId: r.item_id,
                    itemTitle: r.item_title,
                    category: r.category,
                    reason: r.reason,
                    reportedBy: r.reporter_id,
                    reporterEmail: r.reporter_email,
                    processed: r.processed,
                    processedAt: r.processed_at,
                    reportedAt: r.reported_at,
                })));
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
                res.json(sorgen.map(s => ({
                    id: s.id,
                    message: s.message,
                    processed: s.processed,
                    processedAt: s.processed_at,
                    createdAt: s.created_at,
                })));
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