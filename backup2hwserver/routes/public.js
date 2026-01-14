import { Router } from 'express';
import { body, param } from 'express-validator';

export default function createPublicRoutes(deps) {
    const router = Router();
    const {
        models,
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
        filterLessonsForUser
    } = deps;

    const { User, BannedUser, Subject, Announcement, Timetable, TimetableSub, Sorgen } = models;

    // GET /api/countdowns
    router.get('/api/countdowns',
        requireAppGate(appGateSecret),
        async (req, res) => {
            try {
                const { data, error } = await supabase
                    .from('countdowns')
                    .select('*')
                    .order('target_date', { ascending: true });

                if (error) throw error;
                res.json(data || []);
            } catch (err) {
                console.error('GET /api/countdowns error:', err);
                sendJSONError(res, 500, 'Fehler beim Laden der Countdowns');
            }
        }
    );

    // GET /api/timetable
    router.get('/api/timetable',
        requireAppGate(appGateSecret),
        checkUser(userSecret, User),
        async (req, res) => {
            try {
                const timetable = await Timetable.findOne()
                    .sort({ updatedAt: -1 })
                    .lean();
                if (!timetable) {
                    return sendJSONError(res, 404, 'Kein Stundenplan gefunden');
                }
                let lessons = timetable.lessons;
                if (req.user) {
                    const user = await User.findById(req.user.sub)
                        .select('personalized doneSetup enrKurs wpuKurs1 wpuKurs2 theater')
                        .lean();
                    if (user && user.personalized && user.doneSetup) {
                        lessons = filterLessonsForUser(timetable.lessons, user);
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
                const subs = await TimetableSub.find({}).lean();
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
            const list = await Subject.find({}).sort({ name: 1 }).lean();
            res.json(list.map(s => s.name));
        }
    );

    // GET /api/announcements
    router.get('/api/announcements',
        requireAppGate(appGateSecret),
        async (req, res) => {
            const list = await Announcement.find({}).sort({ createdAt: -1 }).limit(5).lean();
            res.json(list);
        }
    );

    // POST /api/announcements
    router.post('/api/announcements',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin,
        validateCsrf(csrfSecret),
        body('content').isString().isLength({ min: 2 }),
        body('color').optional().isIn(['info', 'warn', 'danger']),
        body('showAsPopup').optional().isBoolean(),
        validate,
        async (req, res) => {
            const Content = req.body.content;

            const doc = await Announcement.create({
                content: Content,
                color: req.body.color || 'warn',
                showAsPopup: req.body.showAsPopup || false,
                createdBy: req.user.sub
            });

            await User.findByIdAndUpdate(req.user.sub, {
                $push: { activity: { at: new Date(), type: 'announcement:create', meta: { id: doc._id } } }
            });

            res.status(201).json(doc);
        }
    );

    // DELETE /api/announcements/:id
    router.delete('/api/announcements/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin,
        validateCsrf(csrfSecret),
        async (req, res) => {
            const ann = await Announcement.findById(req.params.id);
            if (!ann) return sendJSONError(res, 404, 'Nicht gefunden');
            if (!req.user.isAdmin && ann.createdBy.toString() !== req.user.sub) return sendJSONError(res, 403, 'Nicht autorisiert.');
            await ann.deleteOne();
            await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'announcement:delete', meta: { id: ann._id } } } });
            res.json({ ok: true });
        }
    );

    // POST /api/uploads/sign
    router.post('/api/uploads/sign',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        async (req, res) => {
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
                folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben'
            });
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
                        error: `Nachricht zu lang (maximal ${MAX_LENGTH} Zeichen)`
                    });
                }

                await Sorgen.create({
                    message: trimmedMessage,
                    createdAt: new Date()
                });

                res.json({ ok: true });
            } catch (err) {
                console.error('POST /anon/sorgenbox error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    return router;
}