import { Router } from 'express';
import { body, param } from 'express-validator';
import * as db from '../db/db.js';

export default function createPublicRoutes(deps) {
    const router = Router();
    const {
        supabase,
        cloudinary,
        authSecret,
        csrfSecret,
        requireAuth,
        checkAuth,
        requireTenant,
        validateCsrf,
        sendJSONError,
        validate,
        requireAdmin,
        filterLessonsForUser,
    } = deps;

    // GET /api/timetable
    router.get('/api/timetable',
        requireAuth(authSecret, supabase),
        requireTenant,
        checkAuth(authSecret),
        async (req, res) => {
            try {
                const lessons = await db.getTimetableLessons(supabase, req.tenantId);
                if (!lessons) {
                    return res.json([]);
                }

                let filteredLessons = lessons;
                if (req.user) {
                    const user = await db.findUserById(supabase, req.user.sub,
                        'personalized, done_setup, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater'
                    );
                    if (user && user.personalized && user.done_setup) {
                        filteredLessons = filterLessonsForUser(lessons, {
                            enrKurs: user.enr_kurs,
                            wpuKurs1: user.wpu_kurs_1,
                            wpuKurs2: user.wpu_kurs_2,
                            theater: user.theater,
                        });
                    }
                }

                // Map to proper camelCase DTOs for frontend
                const mappedLessons = filteredLessons.map(l => ({
                    id: l.id,
                    day: l.day,
                    slot: l.slot,
                    duration: l.duration,
                    room: l.room,
                    courseId: l.course_id,
                    persons: l.persons ? {
                        id: l.persons.id
                    } : null,
                    subjects: l.subjects ? {
                        id: l.subjects.id,
                        name: l.subjects.name
                    } : null,
                    courses: l.courses ? {
                        id: l.courses.id,
                        name: l.courses.name
                    } : null
                }));

                res.json(mappedLessons);
            } catch (err) {
                console.error('GET /api/timetable error', err);
                sendJSONError(res, 500, 'Fehler beim Laden des Stundenplans');
            }
        }
    );

    // GET /api/timetable/subs
    router.get('/api/timetable/subs',
        requireAuth(authSecret, supabase),
        requireTenant,
        async (req, res) => {
            try {
                const subs = await db.listTimetableSubs(supabase, req.tenantId);
                const mappedSubs = subs.map(s => ({
                    id: s.id,
                    lessonId: s.lesson_id,
                    day: s.day,
                    slot: s.slot,
                    duration: s.duration,
                    subject: s.subject,
                    subjectAbbr: s.subject_abbr,
                    room: s.room,
                    cancelled: s.cancelled,
                    hide: s.hide,
                    createdAt: s.created_at,
                }));
                res.json(mappedSubs);
            } catch (err) {
                console.error('GET /api/timetable/subs error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Substitutions');
            }
        }
    );

    // GET /api/subjects
    router.get('/api/subjects',
        requireAuth(authSecret, supabase),
        requireTenant,
        async (req, res) => {
            try {
                const list = await db.listSubjects(supabase, req.tenantId);
                res.json(list);
            } catch (err) {
                console.error('GET /api/subjects error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Fächer');
            }
        }
    );

    // GET /api/announcements
    router.get('/api/announcements',
        requireAuth(authSecret, supabase),
        requireTenant,
        async (req, res) => {
            try {
                const list = await db.listAnnouncements(supabase, req.tenantId, 5);
                const mappedList = list.map(a => ({
                    id: a.id,
                    content: a.content,
                    color: a.color,
                    showAsPopup: a.show_as_popup,
                    createdBy: a.created_by,
                    createdAt: a.created_at
                }));
                res.json(mappedList);
            } catch (err) {
                console.error('GET /api/announcements error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Ankündigungen');
            }
        }
    );

    // POST /api/announcements
    router.post('/api/announcements',
        requireAuth(authSecret, supabase),
        requireAdmin,
        requireTenant,
        validateCsrf(csrfSecret),
        body('content').isString().isLength({ min: 2 }),
        body('color').optional().isIn(['info', 'warn', 'danger']),
        body('showAsPopup').optional().isBoolean(),
        validate,
        async (req, res) => {
            try {
                const ann = await db.createAnnouncement(supabase, req.tenantId, {
                    content: req.body.content,
                    color: req.body.color || 'warn',
                    showAsPopup: req.body.showAsPopup || false,
                    createdBy: req.user.sub,
                });
                await db.logActivity(supabase, req.user.sub, 'announcement:create', { id: ann.id });
                res.status(201).json({
                    id: ann.id,
                    content: ann.content,
                    color: ann.color,
                    showAsPopup: ann.show_as_popup,
                    createdBy: ann.created_by,
                    createdAt: ann.created_at
                });
            } catch (err) {
                console.error('POST /api/announcements error', err);
                sendJSONError(res, 500, 'Fehler beim Erstellen der Ankündigung');
            }
        }
    );

    // DELETE /api/announcements/:id
    router.delete('/api/announcements/:id',
        requireAuth(authSecret, supabase),
        requireAdmin,
        requireTenant,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const ann = await db.findAnnouncementById(supabase, req.tenantId, req.params.id);
                if (!ann) return sendJSONError(res, 404, 'Nicht gefunden');
                if (req.user.role !== 'superadmin' && ann.created_by !== req.user.sub) {
                    return sendJSONError(res, 403, 'Nicht autorisiert.');
                }
                await db.deleteAnnouncement(supabase, req.tenantId, req.params.id);
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
        requireAuth(authSecret, supabase),
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
        requireAuth(authSecret, supabase),
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

    // ─── Reference data endpoints ───────────────────────────────────────────

    // GET /api/persons
    router.get('/api/persons',
        requireAuth(authSecret, supabase),
        requireTenant,
        async (req, res) => {
            try {
                const data = await db.listPersons(supabase, req.tenantId);
                const mappedData = data.map(p => ({
                    id: p.id,
                    name: p.name,
                    short: p.short,
                    title: p.title,
                    personSubjects: p.person_subjects
                }));
                res.json(mappedData);
            } catch (err) {
                console.error('GET /api/persons error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Personen');
            }
        }
    );

    // GET /api/dalton_schedule
    router.get('/api/dalton_schedule',
        requireAuth(authSecret, supabase),
        requireTenant,
        async (req, res) => {
            try {
                const data = await db.listDaltonSchedule(supabase, req.tenantId);
                const mappedData = data.map(r => ({
                    id: r.id,
                    room: r.room,
                    size: r.size,
                    moPersonId: r.mo_person_id,
                    diPersonId: r.di_person_id,
                    miPersonId: r.mi_person_id,
                    doPersonId: r.do_person_id,
                    frPersonId: r.fr_person_id
                }));
                res.json(mappedData);
            } catch (err) {
                console.error('GET /api/dalton_schedule error', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Dalton-Pläne');
            }
        }
    );

    return router;
}