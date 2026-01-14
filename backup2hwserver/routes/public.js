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

    // Legacy-Routen für Abwärtskompatibilität

    // GET /api/checks/me -> redirected zu /api/user/checks
    router.get('/api/checks/me',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        async (req, res) => {
            try {
                const { KeepChecked } = models;
                const docs = await KeepChecked.find({ userId: req.user.sub }).select('itemId -_id').lean();
                const itemIds = docs.map(d => d.itemId.toString());
                res.json({ itemIds });
            } catch (err) {
                console.error('checks/me error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/activity/pageload -> Legacy
    router.post('/api/activity/pageload',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'page:load',
                            meta: {
                                userAgent: req.get('User-Agent')?.substring(0, 100) || 'unknown',
                                timestamp: new Date().toISOString()
                            }
                        }
                    }
                });
                res.json({ ok: true });
            } catch (err) {
                res.json({ ok: false });
            }
        }
    );

    // POST /api/items/:id/check -> Legacy
    router.post('/api/items/:id/check',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const { Item, KeepChecked } = models;
                const item = await Item.findById(req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
                await KeepChecked.updateOne(
                    { itemId: item._id, userId: req.user.sub },
                    { $setOnInsert: { checkedAt: new Date() } },
                    { upsert: true }
                );
                await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:check', meta: { itemId: item._id } } } });
                res.json({ ok: true });
            } catch (err) {
                console.error('check post error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/items/:id/check -> Legacy
    router.delete('/api/items/:id/check',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const { KeepChecked } = models;
                await KeepChecked.deleteOne({ itemId: req.params.id, userId: req.user.sub });
                await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:uncheck', meta: { itemId: req.params.id } } } });
                res.json({ ok: true });
            } catch (err) {
                console.error('check delete error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/reports -> Legacy (umgeleitet zu /api/items/reports)
    router.post('/api/reports',
        requireAppGate(appGateSecret),
        checkUser(userSecret, User),
        validateCsrf(csrfSecret),
        body('itemId').isMongoId(),
        body('itemTitle').isString().isLength({ min: 1, max: 200 }),
        body('category').isIn(['illegal', 'falschinfo']),
        body('reason').optional().isString().isLength({ max: 5000 }),
        validate,
        async (req, res) => {
            try {
                const { Report } = models;
                const { itemId, itemTitle, category, reason } = req.body;

                if (category === 'falschinfo' && (!reason || reason.trim().length === 0)) {
                    return sendJSONError(res, 400, 'Bitte füge einen Grund hinzu.');
                }

                const reportData = {
                    itemId,
                    itemTitle,
                    category,
                    reason: reason ? reason.trim() : null,
                    reportedAt: new Date(),
                    reporterId: req.user ? req.user.sub : null,
                    reporterEmail: req.user ? req.user.email : 'anonymous'
                };
                await Report.create(reportData);

                if (req.user) {
                    await User.findByIdAndUpdate(req.user.sub, {
                        $push: {
                            activity: {
                                at: new Date(),
                                type: 'item:report',
                                meta: {
                                    itemId,
                                    category,
                                    hasReason: !!reason
                                }
                            }
                        }
                    });
                }
                res.status(201).json({
                    ok: true,
                    message: 'Eintrag erfolgreich gemeldet.'
                });
            } catch (err) {
                console.error('POST /api/reports error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // Legacy: /anon/sorgenfind Routen
    router.get('/anon/sorgenfind',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin,
        async (req, res) => {
            try {
                const sorgen = await Sorgen.find({})
                    .sort({ processed: 1, createdAt: -1 })
                    .limit(100);
                res.json(sorgen);
            } catch (err) {
                console.error('GET /anon/sorgenfind error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    router.delete('/anon/sorgenfind/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin,
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const { id } = req.params;
                const deletedSorge = await Sorgen.findByIdAndDelete(id);
                if (!deletedSorge) return sendJSONError(res, 404, 'Sorgen-Eintrag nicht gefunden');
                res.json({ ok: true, message: 'Sorgen-Eintrag erfolgreich gelöscht' });
            } catch (err) {
                console.error('DELETE /anon/sorgenfind/:id error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    router.patch('/anon/sorgenfind/:id/processed',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin,
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        body('processed').isBoolean(),
        validate,
        async (req, res) => {
            try {
                const { id } = req.params;
                const { processed } = req.body;

                const updateData = {
                    processed,
                    processedAt: processed ? new Date() : null,
                    processedBy: processed ? req.user.sub : null
                };

                const sorge = await Sorgen.findByIdAndUpdate(
                    id,
                    { $set: updateData },
                    { new: true }
                );

                if (!sorge) return sendJSONError(res, 404, 'Sorgen-Eintrag nicht gefunden');

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: processed ? 'admin:sorge:mark_processed' : 'admin:sorge:mark_unprocessed',
                            meta: { sorgeId: id }
                        }
                    }
                });

                res.json({
                    ok: true,
                    processed: sorge.processed,
                    processedAt: sorge.processedAt
                });
            } catch (err) {
                console.error('PATCH /anon/sorgenfind/:id/processed error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    return router;
}