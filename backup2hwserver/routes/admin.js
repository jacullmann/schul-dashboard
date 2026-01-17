import { Router } from 'express';
import { body, param } from 'express-validator';
import dayjs from 'dayjs';

export default function createAdminRoutes(deps) {
    const router = Router();
    const {
        models,
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
        requireAdmin
    } = deps;

    const { User, BannedUser, Item, KeepChecked, Report, Sorgen, Subject, TimetableSub, EncryptedTodo } = models;

    // Hilfsfunktion für Admin-Middleware-Kette
    const adminAuth = [
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        requireAdmin
    ];

    // DELETE /api/admin/cleanup/old-items
    router.delete('/cleanup/old-items',
        ...adminAuth,
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

                const oldItems = await Item.find({
                    createdAt: { $lt: ninetyDaysAgo }
                }).select('images _id').lean();

                const publicIdsToDelete = [];
                const itemIdsToDelete = oldItems.map(item => {
                    if (item.images && item.images.length > 0) {
                        item.images.forEach(img => {
                            if (img.publicId) publicIdsToDelete.push(img.publicId);
                        });
                    }
                    return item._id;
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

                await KeepChecked.deleteMany({ itemId: { $in: itemIdsToDelete } });

                const result = await Item.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'admin:cleanup:old_items',
                            meta: {
                                deletedCount: result.deletedCount,
                                imagesDeleted: publicIdsToDelete.length
                            }
                        }
                    }
                });

                res.json({
                    ok: true,
                    deletedItems: result.deletedCount,
                    deletedImages: publicIdsToDelete.length,
                    message: `${result.deletedCount} Einträge und ${publicIdsToDelete.length} Bilder gelöscht.`
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
                const { data, error: dbError } = await supabase
                    .from('security_events')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(500);

                if (dbError) {
                    console.error('Supabase DB Error:', dbError);
                    return sendJSONError(res, 500, 'Fehler beim Abrufen der Logs von Supabase.');
                }
                if (!data || data.length === 0) return sendJSONError(res, 404, 'Keine Security-Events gefunden.');

                const logsJsonString = JSON.stringify(data, null, 2);
                const truncatedLogs = logsJsonString.length > 50000
                    ? logsJsonString.substring(0, 50000) + "\n... (Daten zur Anzeige gekürzt)"
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
1.  **Zusammenfassung:** Kurze Übersicht (z.B. "Sicherheitslage stabil", "Auffälligkeiten erkannt").
2.  **Trendanalyse:** Gibt es Muster? (z.B. Uhrzeiten von Angriffen, Zunahme von 'failure'-Events, auffällige User-Agents).
3.  **Auffällige Aktivitäten & IPs:** Identifiziere spezifische Bedrohungen.
    * Gibt es IPs mit extrem vielen 'failure'-Events bei 'app_gate_login' (Brute-Force-Versuche)? Liste die Top 3 verdächtigsten IPs auf.
    * Gibt es IPs mit vielen verschiedenen User-Agents?
    * Gibt es verdächtige 'success'-Events nach vielen 'failure'-Events von derselben IP (möglicher erfolgreicher Einbruch)?
4.  **Empfohlene Maßnahmen:** Konkrete, priorisierte Tipps. (z.B. "IP X.X.X.X auf Firewall blockieren", "Rate-Limiting verschärfen").
5.  **Sicherheitswarnungen:** (Nur falls akute, offensichtliche Bedrohungen wie ein erfolgreicher Einbruch klar erkennbar sind).

Formatiere die gesamte Ausgabe als sauberes Markdown. Beginne direkt mit der ersten Überschrift (z.B. "## Zusammenfassung").
Hinweis: Es handelt sich bei der Authentifizierung nicht um eine klassische mit Benutzerkonten, sondern um eine äußere Authentifizierung. Die Website ist nur für autorisierte Personen zugänglich, die das allgemeine Passwort kennen. Es gibt keine individuellen Accounts.
Sei weder zu lasch, noch sieh jede Abfolge von Fehlschlägen als Angriff. Entscheide intelligent und hilfreich.
      `;

                if (!geminiClient) {
                    return sendJSONError(res, 500, 'Gemini API Key ist ungültig oder nicht initialisiert.');
                }

                const response = await geminiClient.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });
                const reportText = response.text;
                res.json({ ok: true, report: reportText });

            } catch (err) {
                console.error('Fehler beim Generieren des Sicherheitsberichts:', err);
                if (err.message && err.message.includes('API key not valid')) {
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
                const userCount = await User.countDocuments({});
                const itemCount = await Item.countDocuments({});
                const bannedCount = await BannedUser.countDocuments({});

                const reportCountUnprocessed = await Report.countDocuments({ processed: { $ne: true } });
                const reportCountTotal = await Report.countDocuments({});
                const sorgeCountUnprocessed = await Sorgen.countDocuments({ processed: { $ne: true } });
                const sorgeCountTotal = await Sorgen.countDocuments({});

                const itemsByType = await Item.aggregate([
                    { $group: { _id: "$type", count: { $sum: 1 } } }
                ]);

                const verifiedUsers = await User.countDocuments({ emailVerified: true });
                const unverifiedUsers = userCount - verifiedUsers;
                const adminCount = await User.countDocuments({ isAdmin: true });

                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                const oldItemsCount = await Item.countDocuments({ createdAt: { $lt: ninetyDaysAgo } });

                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
                const newItemsThisWeek = await Item.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

                const topCreators = await Item.aggregate([
                    { $group: { _id: "$createdBy", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 5 },
                    {
                        $lookup: {
                            from: 'hwusers',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'user'
                        }
                    },
                    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                    { $project: { count: 1, email: '$user.email' } }
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
                    unverifiedUsers,
                    adminCount,
                    oldItemsCount,
                    newUsersThisWeek,
                    newItemsThisWeek,
                    topCreators
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
                const subs = await TimetableSub.find({}).sort({ createdAt: -1 }).lean();
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
            body('hide').optional().isBoolean()
        ],
        validate,
        async (req, res) => {
            try {
                const subData = req.body;
                const newSub = await TimetableSub.create(subData);

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'timetable:sub:create',
                            meta: { lessonId: subData.lessonId }
                        }
                    }
                });

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
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const { id } = req.params;
                const deletedSub = await TimetableSub.findByIdAndDelete(id);

                if (!deletedSub) {
                    return sendJSONError(res, 404, 'Substitution nicht gefunden');
                }

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'timetable:sub:delete',
                            meta: { lessonId: deletedSub.lessonId }
                        }
                    }
                });

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

                const report = await Report.findByIdAndUpdate(
                    id,
                    { $set: updateData },
                    { new: true }
                );

                if (!report) return sendJSONError(res, 404, 'Meldung nicht gefunden');

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: processed ? 'admin:report:mark_processed' : 'admin:report:mark_unprocessed',
                            meta: { reportId: id }
                        }
                    }
                });

                res.json({
                    ok: true,
                    processed: report.processed,
                    processedAt: report.processedAt
                });
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
            const users = await User.find({}).sort({ createdAt: -1 }).lean();
            res.json(users.map(u => ({
                id: u._id, email: u.email, isAdmin: u.isAdmin,
                createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
                activity: u.activity?.slice(-20) || []
            })));
        }
    );

    // DELETE /api/admin/reports/:id
    router.delete('/reports/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const { id } = req.params;
                const deletedReport = await Report.findByIdAndDelete(id);
                if (!deletedReport) return sendJSONError(res, 404, 'Meldung nicht gefunden');

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'admin:report:delete',
                            meta: { reportId: id }
                        }
                    }
                });

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
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            const targetUser = await User.findById(req.params.id);
            if (targetUser?.isAdmin) return sendJSONError(res, 403, 'Admins können nicht gelöscht werden');
            await KeepChecked.deleteMany({ userId: req.params.id });
            await EncryptedTodo.deleteMany({ userId: req.params.id });
            await User.deleteOne({ _id: req.params.id });
            await Item.deleteMany({ createdBy: req.params.id });
            res.json({ ok: true });
        }
    );

    // PATCH /api/admin/users/:id
    router.patch('/users/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        body('isAdmin').isBoolean(),
        validate,
        async (req, res) => {
            await User.findByIdAndUpdate(req.params.id, { $set: { isAdmin: !!req.body.isAdmin } });
            res.json({ ok: true });
        }
    );

    // POST /api/admin/subjects
    router.post('/subjects',
        ...adminAuth,
        validateCsrf(csrfSecret),
        body('name').isString().isLength({ min: 2, max: 50 }),
        validate,
        async (req, res) => {
            await Subject.updateOne({ name: req.body.name }, { $set: { name: req.body.name } }, { upsert: true });
            res.status(201).json({ ok: true });
        }
    );

    // DELETE /api/admin/subjects/:name
    router.delete('/subjects/:name',
        ...adminAuth,
        validateCsrf(csrfSecret),
        async (req, res) => {
            await Subject.deleteOne({ name: req.params.name });
            res.json({ ok: true });
        }
    );

    // GET /api/admin/all-users
    router.get('/all-users',
        ...adminAuth,
        async (req, res) => {
            try {
                const users = await User.find({}).select('-passwordHash -activity').sort({ createdAt: -1 }).lean();
                const bannedDocs = await BannedUser.find({}).select('userId').lean();
                const bannedIds = new Set(bannedDocs.map(b => b.userId.toString()));
                const usersWithSafeData = users.map(u => ({
                    id: u._id,
                    email: u.email,
                    isAdmin: u.isAdmin,
                    emailVerified: u.emailVerified,
                    createdAt: u.createdAt,
                    lastLoginAt: u.lastLoginAt,
                    enrKurs: u.enrKurs,
                    wpuKurs1: u.wpuKurs1,
                    wpuKurs2: u.wpuKurs2,
                    theater: u.theater,
                    doneSetup: u.doneSetup,
                    isBanned: bannedIds.has(u._id.toString())
                }));
                res.json(usersWithSafeData);
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
                const user = await User.findById(req.params.id).select('activity').lean();
                if (!user) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
                res.json(user.activity || []);
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
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const userToBan = await User.findById(req.params.id).lean();
                if (!userToBan) return sendJSONError(res, 404, 'Benutzer nicht gefunden');
                if (userToBan.isAdmin) return sendJSONError(res, 400, 'Du kannst keine Admins bannen.');
                await BannedUser.updateOne(
                    { userId: userToBan._id },
                    { $set: { bannedAt: new Date() } },
                    { upsert: true }
                );
                await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'admin:ban:user', meta: { targetUserId: userToBan._id } } } });
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
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const userId = req.params.id;
                await BannedUser.deleteOne({ userId: userId });
                await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'admin:unban:user', meta: { targetUserId: userId } } } });
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
                const reports = await Report.find({})
                    .sort({ processed: 1, reportedAt: -1 })
                    .limit(100)
                    .lean();
                res.json(reports);
            } catch (err) {
                console.error('GET /api/admin/reports error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/admin/countdowns
    router.post('/countdowns',
        ...adminAuth,
        validateCsrf(csrfSecret),
        [
            body('name').isString().isLength({ min: 1, max: 100 }),
            body('description').optional().isString().isLength({ max: 200 }),
            body('target_date').isISO8601()
        ],
        validate,
        async (req, res) => {
            try {
                const { name, description, target_date } = req.body;

                const { data, error } = await supabase
                    .from('countdowns')
                    .insert([{
                        name: name.trim(),
                        description: description?.trim() || '',
                        target_date: target_date
                    }])
                    .select();

                if (error) throw error;

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'countdown:create',
                            meta: { countdownId: data[0].id, name: data[0].name }
                        }
                    }
                });

                res.status(201).json({ ok: true, countdown: data[0] });
            } catch (err) {
                console.error('POST /api/admin/countdowns error:', err);
                sendJSONError(res, 500, 'Fehler beim Erstellen des Countdowns');
            }
        }
    );

    // PUT /api/admin/countdowns/:id
    router.put('/countdowns/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        [
            param('id').isUUID(),
            body('name').isString().isLength({ min: 1, max: 100 }),
            body('description').optional().isString().isLength({ max: 200 }),
            body('target_date').isISO8601()
        ],
        validate,
        async (req, res) => {
            try {
                const { id } = req.params;
                const { name, description, target_date } = req.body;

                const { data, error } = await supabase
                    .from('countdowns')
                    .update({
                        name: name.trim(),
                        description: description?.trim() || '',
                        target_date: target_date,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .select();

                if (error) throw error;
                if (!data || data.length === 0) {
                    return sendJSONError(res, 404, 'Countdown nicht gefunden');
                }

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'countdown:update',
                            meta: { countdownId: id, name: name }
                        }
                    }
                });

                res.json({ ok: true, countdown: data[0] });
            } catch (err) {
                console.error('PUT /api/admin/countdowns/:id error:', err);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren des Countdowns');
            }
        }
    );

    // DELETE /api/admin/countdowns/:id
    router.delete('/countdowns/:id',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const { id } = req.params;

                const { data: countdownData, error: fetchError } = await supabase
                    .from('countdowns')
                    .select('name')
                    .eq('id', id)
                    .single();

                if (fetchError) {
                    return sendJSONError(res, 404, 'Countdown nicht gefunden');
                }

                const { error } = await supabase
                    .from('countdowns')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'countdown:delete',
                            meta: { countdownId: id, name: countdownData.name }
                        }
                    }
                });

                res.json({ ok: true, message: 'Countdown erfolgreich gelöscht' });
            } catch (err) {
                console.error('DELETE /api/admin/countdowns/:id error:', err);
                sendJSONError(res, 500, 'Fehler beim Löschen des Countdowns');
            }
        }
    );

    // DELETE /api/admin/users/:id/activity/prune
    router.delete('/users/:id/activity/prune',
        ...adminAuth,
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const userId = req.params.id;
                const limitDate = dayjs().subtract(30, 'day').toDate();

                const result = await User.findByIdAndUpdate(userId, {
                    $pull: { activity: { at: { $lt: limitDate } } }
                });

                if (!result) return sendJSONError(res, 404, 'Benutzer nicht gefunden');

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'admin:prune_logs',
                            meta: { targetUserId: userId }
                        }
                    }
                });

                res.json({ ok: true, message: 'Logs bereinigt.' });
            } catch (err) {
                console.error('Prune logs error', err);
                sendJSONError(res, 500, 'Fehler beim Bereinigen');
            }
        }
    );

    // Sorgen-Routen (unter /api/admin gemountet als /sorgen/*)

    // GET /api/admin/sorgen (war /anon/sorgenfind)
    router.get('/sorgen',
        ...adminAuth,
        async (req, res) => {
            try {
                const sorgen = await Sorgen.find({})
                    .sort({ processed: 1, createdAt: -1 })
                    .limit(100);
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
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const { id } = req.params;
                const deletedSorge = await Sorgen.findByIdAndDelete(id);
                if (!deletedSorge) return sendJSONError(res, 404, 'Sorgen-Eintrag nicht gefunden');
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
                console.error('PATCH /api/admin/sorgen/:id/processed error', err);
                sendJSONError(res, 500, 'Serverfehler');
            }
        }
    );

    return router;
}