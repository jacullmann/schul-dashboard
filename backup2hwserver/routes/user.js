import { Router } from 'express';
import { body, param } from 'express-validator';

export default function createUserRoutes(deps) {
    const router = Router();
    const {
        models,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        validateCsrf,
        sendJSONError,
        validate
    } = deps;

    // Added PinnedItem to destructuring
    const { User, BannedUser, Item, KeepChecked, PinnedItem } = models;

    // PATCH /api/user/personalization
    router.patch('/personalization',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        body('personalized').isBoolean(),
        validate,
        async (req, res) => {
            try {
                const { personalized } = req.body;
                const userId = req.user.sub;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $set: { personalized } },
                    { new: true, fields: 'personalized email isAdmin' }
                );

                if (!updatedUser) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                await User.findByIdAndUpdate(userId, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'profile:personalization:update',
                            meta: { personalized }
                        }
                    }
                });

                res.json({
                    ok: true,
                    personalized: updatedUser.personalized
                });
            } catch (err) {
                console.error('PATCH /api/user/personalization error', err);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren der Personalisierung');
            }
        }
    );

    // PATCH /api/user/setup
    router.patch('/setup',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        body('enrKurs').exists().withMessage('enrKurs ist erforderlich').isInt({ min: 0 }).toInt(),
        body('wpuKurs1').exists().withMessage('wpuKurs1 ist erforderlich').isInt({ min: 0 }).toInt(),
        body('wpuKurs2').exists().withMessage('wpuKurs2 ist erforderlich').isInt({ min: 0 }).toInt(),
        body('theater').exists().withMessage('Theater ist erforderlich').isInt({ min: 0 }).toInt(),
        validate,
        async (req, res) => {
            const { enrKurs, wpuKurs1, wpuKurs2, theater } = req.body;
            const userId = req.user.sub;
            const updateData = { enrKurs, wpuKurs1, wpuKurs2, theater, doneSetup: true };
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, fields: 'enrKurs wpuKurs1 wpuKurs2 theater doneSetup email isAdmin' }
            );
            if (!updatedUser) return sendJSONError(res, 404, 'Nutzer nicht gefunden');
            await User.findByIdAndUpdate(userId, { $push: { activity: { at: new Date(), type: 'profile:setup:complete', meta: { enrKurs, wpuKurs1, wpuKurs2, theater } } } });
            res.json({
                ok: true,
                user: {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    isAdmin: updatedUser.isAdmin,
                    enrKurs: updatedUser.enrKurs,
                    wpuKurs1: updatedUser.wpuKurs1,
                    wpuKurs2: updatedUser.wpuKurs2,
                    theater: updatedUser.theater,
                    doneSetup: updatedUser.doneSetup
                }
            });
        }
    );

    // GET /api/user/checks (war /api/checks/me)
    router.get('/checks',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        async (req, res) => {
            try {
                const docs = await KeepChecked.find({ userId: req.user.sub }).select('itemId -_id').lean();
                const itemIds = docs.map(d => d.itemId.toString());
                res.json({ itemIds });
            } catch (err) {
                console.error('checks/me error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // GET /api/user/pins
    router.get('/pins',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        async (req, res) => {
            try {
                const docs = await PinnedItem.find({ userId: req.user.sub }).select('itemId -_id').lean();
                const itemIds = docs.map(d => d.itemId.toString());
                res.json({ itemIds });
            } catch (err) {
                console.error('pins/me error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/user/activity/pageload (war /api/activity/pageload)
    router.post('/activity/pageload',
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

    // POST /api/user/items/:id/check (war /api/items/:id/check)
    router.post('/items/:id/check',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
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

    // POST /api/user/items/:id/pin
    router.post('/items/:id/pin',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const item = await Item.findById(req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');
                await PinnedItem.updateOne(
                    { itemId: item._id, userId: req.user.sub },
                    { $setOnInsert: { pinnedAt: new Date() } },
                    { upsert: true }
                );
                await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:pin', meta: { itemId: item._id } } } });
                res.json({ ok: true });
            } catch (err) {
                console.error('pin post error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/user/items/:id/check
    router.delete('/items/:id/check',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                await KeepChecked.deleteOne({ itemId: req.params.id, userId: req.user.sub });
                await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:uncheck', meta: { itemId: req.params.id } } } });
                res.json({ ok: true });
            } catch (err) {
                console.error('check delete error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/user/items/:id/pin
    router.delete('/items/:id/pin',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                await PinnedItem.deleteOne({ itemId: req.params.id, userId: req.user.sub });
                await User.findByIdAndUpdate(req.user.sub, { $push: { activity: { at: new Date(), type: 'item:unpin', meta: { itemId: req.params.id } } } });
                res.json({ ok: true });
            } catch (err) {
                console.error('pin delete error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    return router;
}