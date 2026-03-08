// routes/groupAdmin.js
// Group-scoped admin routes: timetable subs, announcements, stats, cleanup
import { Router } from 'express';
import { body, param } from 'express-validator';
import * as db from '../db/db.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export default function createGroupAdminRoutes(deps) {
    const router = Router();
    const {
        supabase,
        cloudinary,
        authSecret,
        requireAuth,
        validateCsrf,
        sendJSONError,
        validate,
    } = deps;

    // admin or mod of the active tenant
    const ga = [requireAuth(authSecret, supabase, ['admin', 'mod'])];

    // ─── Stats ──────────────────────────────────────────────────────
    router.get('/stats', ...ga, async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();

            const [itemCount, subsCount, oldItemsCount] = await Promise.all([
                db.countItems(supabase, tenantId),
                db.listTimetableSubs(supabase, tenantId).then(s => s.length),
                db.countItemsOlderThan(supabase, tenantId, ninetyDaysAgo),
            ]);

            res.json({ itemCount, subsCount, oldItemsCount });
        } catch (err) {
            console.error('GET /api/group-admin/stats error', err);
            sendJSONError(res, 500, 'Serverfehler');
        }
    });

    // ─── Cleanup old items ──────────────────────────────────────────
    router.delete('/cleanup/old-items', ...ga, validateCsrf(), async (req, res) => {
        try {
            const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
            const oldItems = await db.findOldItems(supabase, req.tenantId, ninetyDaysAgo);

            const publicIdsToDelete = [];
            const itemIds = oldItems.map(item => {
                (item.images || []).forEach(img => {
                    if (img.publicId) publicIdsToDelete.push(img.publicId);
                });
                return item.id;
            });

            if (publicIdsToDelete.length > 0) {
                for (let i = 0; i < publicIdsToDelete.length; i += 100) {
                    try {
                        await cloudinary.api.delete_resources(publicIdsToDelete.slice(i, i + 100));
                    } catch (e) {
                        console.error('Cloudinary batch delete error:', e);
                    }
                }
            }

            await db.deleteItemsOlderThan(supabase, req.tenantId, ninetyDaysAgo);
            await db.logActivity(supabase, req.userId, 'group-admin:cleanup', {
                deletedCount: itemIds.length,
            });

            res.json({
                ok: true,
                deletedItems: itemIds.length,
                deletedImages: publicIdsToDelete.length,
                message: `${itemIds.length} Einträge gelöscht.`,
            });
        } catch (err) {
            sendJSONError(res, 500, 'Fehler beim Bereinigen');
        }
    });

    // ─── Timetable subs ─────────────────────────────────────────────
    router.get('/timetable/subs', ...ga, async (req, res) => {
        try {
            const subs = await db.listTimetableSubs(supabase, req.tenantId);
            res.json(subs.map(s => ({
                id: s.id, lessonId: s.lesson_id, day: s.day, slot: s.slot,
                duration: s.duration, subject: s.subject, teacher: s.teacher,
                room: s.room, cancelled: s.cancelled, hide: s.hide, createdAt: s.created_at,
            })));
        } catch (err) {
            sendJSONError(res, 500, 'Fehler beim Laden der Substitutions');
        }
    });

    router.post('/timetable/subs', ...ga, validateCsrf(),
        [body('lessonId').isUUID(), body('day').optional().isString(), body('slot').optional().isInt(),
            body('duration').optional().isInt(), body('subject').optional().isString(),
            body('teacher').optional().isString(), body('room').optional().isString(),
            body('cancelled').optional().isBoolean(), body('hide').optional().isBoolean()],
        validate, async (req, res) => {
            try {
                const newSub = await db.createTimetableSub(supabase, req.tenantId, req.body);
                await db.logActivity(supabase, req.userId, 'timetable:sub:create', { lessonId: req.body.lessonId });
                res.status(201).json(newSub);
            } catch (err) {
                sendJSONError(res, 500, 'Fehler beim Speichern');
            }
        },
    );

    router.delete('/timetable/subs/:id', ...ga, validateCsrf(), param('id').isUUID(), validate, async (req, res) => {
        try {
            await db.deleteTimetableSub(supabase, req.tenantId, req.params.id);
            res.json({ ok: true });
        } catch (err) {
            sendJSONError(res, 500, 'Fehler beim Löschen');
        }
    });

    // ─── Announcements ──────────────────────────────────────────────
    router.post('/announcements', ...ga, validateCsrf(),
        body('content').isString().isLength({ min: 2 }),
        body('color').optional().isIn(['info', 'warn', 'danger']),
        body('showAsPopup').optional().isBoolean(),
        validate, async (req, res) => {
            try {
                const ann = await db.createAnnouncement(supabase, req.tenantId, {
                    content: req.body.content,
                    color: req.body.color || 'warn',
                    showAsPopup: req.body.showAsPopup || false,
                    createdBy: req.userId,
                });
                res.status(201).json({
                    id: ann.id, content: ann.content, color: ann.color,
                    showAsPopup: ann.show_as_popup, createdBy: ann.created_by, createdAt: ann.created_at,
                });
            } catch (err) {
                sendJSONError(res, 500, 'Fehler beim Erstellen');
            }
        },
    );

    router.delete('/announcements/:id', ...ga, validateCsrf(), param('id').isUUID(), validate, async (req, res) => {
        try {
            const ann = await db.findAnnouncementById(supabase, req.tenantId, req.params.id);
            if (!ann) return sendJSONError(res, 404, 'Nicht gefunden');
            await db.deleteAnnouncement(supabase, req.tenantId, req.params.id);
            res.json({ ok: true });
        } catch (err) {
            sendJSONError(res, 500, 'Fehler beim Löschen');
        }
    });

    return router;
}