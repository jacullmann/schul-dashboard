import { Router } from 'express';
import { body, param } from 'express-validator';
import * as db from '../db/db.js';

export default function createPublicRoutes(deps) {
    const router = Router();
    const {
        supabase,
        cloudinary,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        checkUser,
        validateCsrf,
        sendJSONError,
        validate,
        requireAdmin,
        filterLessonsForUser,
    } = deps;

    // GET /api/timetable
    router.get('/api/timetable',
        requireAppGate(appGateSecret),
        checkUser(userSecret, supabase),
        async (req, res) => {
            try {
                const timetable = await db.getLatestTimetable(supabase);
                if (!timetable) {
                    return sendJSONError(res, 404, 'Kein Stundenplan gefunden');
                }

                let lessons = timetable.lessons;
                if (req.user) {
                    const user = await db.findUserById(supabase, req.user.sub,
                        'personalized, done_setup, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater'
                    );
                    if (user && user.personalized && user.done_setup) {
                        lessons = filterLessonsForUser(timetable.lessons, {
                            enrKurs: user.enr_kurs,
                            wpuKurs1: user.wpu_kurs_1,
                            wpuKurs2: user.wpu_kurs_2,
                            theater: user.theater,
                        });
                    }
                }
                res.json(lessons);
            } catch (err) {
                console.error('GET /api/timetable error', err);
                sendJSONError(res, 500, 'Fehler beim Laden des Stundenplans');
            }
        }
    );

    // GET /api/timetable/subs
    router.get('/api/timetable/subs',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const subs = await db.listTimetableSubs(supabase);
                res.json(subs);
            } catch (err) {
                console.error('GET /api/timetable/subs error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Substitutions');
            }
        }
    );

    // GET /api/subjects
    router.get('/api/subjects',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const list = await db.listSubjects(supabase);
                res.json(list);
            } catch (err) {
                console.error('GET /api/subjects error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Fächer');
            }
        }
    );

    // GET /api/announcements
    router.get('/api/announcements',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const list = await db.listAnnouncements(supabase, 5);
                res.json(list);
            } catch (err) {
                console.error('GET /api/announcements error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Ankündigungen');
            }
        }
    );

    // POST /api/announcements
    router.post('/api/announcements',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireAdmin,
        validateCsrf(csrfSecret),
        body('content').isString().isLength({ min: 2 }),
        body('color').optional().isIn(['info', 'warn', 'danger']),
        body('showAsPopup').optional().isBoolean(),
        validate,
        async (req, res) => {
            try {
                const ann = await db.createAnnouncement(supabase, {
                    content: req.body.content,
                    color: req.body.color || 'warn',
                    showAsPopup: req.body.showAsPopup || false,
                    createdBy: req.user.sub,
                });
                await db.logActivity(supabase, req.user.sub, 'announcement:create', { id: ann.id });
                res.status(201).json(ann);
            } catch (err) {
                console.error('POST /api/announcements error', err);
                sendJSONError(res, 500, 'Fehler beim Erstellen der Ankündigung');
            }
        }
    );

    // DELETE /api/announcements/:id
    router.delete('/api/announcements/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireAdmin,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const ann = await db.findAnnouncementById(supabase, req.params.id);
                if (!ann) return sendJSONError(res, 404, 'Nicht gefunden');
                if (req.user.role !== 'superadmin' && ann.created_by !== req.user.sub) {
                    return sendJSONError(res, 403, 'Nicht autorisiert.');
                }
                await db.deleteAnnouncement(supabase, req.params.id);
                await db.logActivity(supabase, req.user.sub, 'announcement:delete', { id: ann.id });
                res.json({ ok: true });
            } catch (err) {
                console.error('DELETE /api/announcements/:id error', err);
                sendJSONError(res, 500, 'Fehler beim Löschen der Ankündigung');
            }
        }
    );

    // POST /api/uploads/sign
    router.post('/api/uploads/sign',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const timestamp = Math.floor(Date.now() / 1000);
                const signature = cloudinary.utils.api_sign_request(
                    { timestamp, folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben' },
                    process.env.CLOUDINARY_API_SECRET
                );
                res.json({
                    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                    apiKey: process.env.CLOUDINARY_API_KEY,
                    timestamp,
                    signature,
                    folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben',
                });
            } catch (err) {
                console.error('POST /api/uploads/sign error', err);
                sendJSONError(res, 500, 'Fehler beim Erstellen der Upload-Signatur');
            }
        }
    );

    // POST /anon/sorgenbox
    router.post('/anon/sorgenbox',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const { message } = req.body;
                if (!message || message.trim().length === 0) {
                    return res.status(400).json({ error: 'Validierungsfehler. Die Nachricht darf nicht leer sein.' });
                }

                const trimmedMessage = message.trim();
                const MAX_LENGTH = 5000;

                if (trimmedMessage.length > MAX_LENGTH) {
                    return res.status(400).json({
                        error: `Nachricht zu lang (maximal ${MAX_LENGTH} Zeichen)`,
                    });
                }

                await db.createSorge(supabase, trimmedMessage);
                res.json({ ok: true });
            } catch (err) {
                console.error('POST /anon/sorgenbox error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // ─── Reference data endpoints (replacing direct Supabase client calls) ──

    // GET /api/persons
    router.get('/api/persons',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const data = await db.listPersons(supabase);
                res.json(data);
            } catch (err) {
                console.error('GET /api/persons error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Personen');
            }
        }
    );

    // GET /api/dalton_schedule
    router.get('/api/dalton_schedule',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const data = await db.listDaltonSchedule(supabase);
                res.json(data);
            } catch (err) {
                console.error('GET /api/dalton_schedule error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Dalton-Pläne');
            }
        }
    );

    // GET /api/days
    router.get('/api/days',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const data = await db.listDays(supabase);
                res.json(data);
            } catch (err) {
                console.error('GET /api/days error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Tage');
            }
        }
    );

    // GET /api/lesson-hours
    router.get('/api/lesson-hours',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const data = await db.listLessonHours(supabase);
                res.json(data);
            } catch (err) {
                console.error('GET /api/lesson-hours error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Stunden');
            }
        }
    );

    // GET /api/schedule-entries
    router.get('/api/schedule-entries',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const data = await db.listScheduleEntries(supabase);
                res.json(data);
            } catch (err) {
                console.error('GET /api/schedule-entries error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Einträge');
            }
        }
    );

    // GET /api/double-lessons
    router.get('/api/double-lessons',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const data = await db.listDoubleLessons(supabase);
                res.json(data);
            } catch (err) {
                console.error('GET /api/double-lessons error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Doppelstunden');
            }
        }
    );

    return router;
}