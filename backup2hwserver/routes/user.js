import { Router } from 'express';
import { body, param } from 'express-validator';
import * as db from '../db/db.js';

export default function createUserRoutes(deps) {
    const router = Router();
    const {
        supabase,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        requireTenant,
        validateCsrf,
        sendJSONError,
        validate,
    } = deps;

    // PATCH /api/user/personalization
    router.patch('/personalization',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        body('personalized').isBoolean(),
        validate,
        async (req, res) => {
            try {
                const { personalized } = req.body;
                const userId = req.user.sub;

                const updatedUser = await db.updateUser(supabase, userId, { personalized });
                if (!updatedUser) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                await db.logActivity(supabase, userId, 'profile:personalization:update', { personalized });

                res.json({
                    ok: true,
                    personalized: updatedUser.personalized,
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
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        body('enrKurs').optional({ nullable: true }).isUUID().withMessage('ungültiges Format'),
        body('wpuKurs1').optional({ nullable: true }).isUUID().withMessage('ungültiges Format'),
        body('wpuKurs2').optional({ nullable: true }).isUUID().withMessage('ungültiges Format'),
        body('theater').exists().withMessage('Theater ist erforderlich').isInt({ min: 0 }).toInt(),
        validate,
        async (req, res) => {
            try {
                const { enrKurs, wpuKurs1, wpuKurs2, theater } = req.body;
                const userId = req.user.sub;

                const isDone = Boolean(enrKurs && wpuKurs1 && wpuKurs2 && theater > 0);

                const updatedUser = await db.updateUser(supabase, userId, {
                    enr_kurs: enrKurs,
                    wpu_kurs_1: wpuKurs1,
                    wpu_kurs_2: wpuKurs2,
                    theater,
                    done_setup: isDone,
                });
                if (!updatedUser) return sendJSONError(res, 404, 'Nutzer nicht gefunden');

                await db.logActivity(supabase, userId, 'profile:setup:complete', {
                    enrKurs, wpuKurs1, wpuKurs2, theater,
                });

                res.json({
                    ok: true,
                    user: {
                        id: updatedUser.id,
                        email: updatedUser.email,
                        role: req.user.role,
                        enrKurs: updatedUser.enr_kurs,
                        wpuKurs1: updatedUser.wpu_kurs_1,
                        wpuKurs2: updatedUser.wpu_kurs_2,
                        theater: updatedUser.theater,
                        doneSetup: updatedUser.done_setup,
                    },
                });
            } catch (err) {
                console.error('PATCH /api/user/setup error', err);
                sendJSONError(res, 500, 'Fehler beim Speichern des Setups');
            }
        }
    );

    // GET /api/user/checks
    router.get('/checks',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        async (req, res) => {
            try {
                const itemIds = await db.getCheckedItemIds(supabase, req.user.sub);
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
        requireUser(userSecret, supabase),
        async (req, res) => {
            try {
                const itemIds = await db.getPinnedItemIds(supabase, req.user.sub);
                res.json({ itemIds });
            } catch (err) {
                console.error('pins/me error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // GET /api/user/archives
    router.get('/archives',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        async (req, res) => {
            try {
                const itemIds = await db.getArchivedItemIds(supabase, req.user.sub);
                res.json({ itemIds });
            } catch (err) {
                console.error('archives/me error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/user/items/:id/archive
    router.post('/items/:id/archive',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireTenant,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.tenantId, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

                await db.archiveItem(supabase, item.id, req.user.sub);
                await db.logActivity(supabase, req.user.sub, 'item:archive', { itemId: item.id });
                res.json({ ok: true });
            } catch (err) {
                console.error('archive post error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // DELETE /api/user/items/:id/archive
    router.delete('/items/:id/archive',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                await db.unarchiveItem(supabase, req.params.id, req.user.sub);
                await db.logActivity(supabase, req.user.sub, 'item:unarchive', { itemId: req.params.id });
                res.json({ ok: true });
            } catch (err) {
                console.error('archive delete error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    // POST /api/user/activity/pageload
    router.post('/activity/pageload',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        async (req, res) => {
            try {
                await db.logActivity(supabase, req.user.sub, 'page:load', {
                    userAgent: req.get('User-Agent')?.substring(0, 100) || 'unknown',
                    timestamp: new Date().toISOString(),
                });
                res.json({ ok: true });
            } catch (err) {
                res.json({ ok: false });
            }
        }
    );

    // POST /api/user/items/:id/check
    router.post('/items/:id/check',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        requireTenant,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.tenantId, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

                await db.checkItem(supabase, item.id, req.user.sub);
                await db.logActivity(supabase, req.user.sub, 'item:check', { itemId: item.id });
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
        requireUser(userSecret, supabase),
        requireTenant,
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const item = await db.findItemById(supabase, req.tenantId, req.params.id);
                if (!item) return sendJSONError(res, 404, 'Nicht gefunden');

                await db.pinItem(supabase, item.id, req.user.sub);
                await db.logActivity(supabase, req.user.sub, 'item:pin', { itemId: item.id });
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
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                await db.uncheckItem(supabase, req.params.id, req.user.sub);
                await db.logActivity(supabase, req.user.sub, 'item:uncheck', { itemId: req.params.id });
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
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                await db.unpinItem(supabase, req.params.id, req.user.sub);
                await db.logActivity(supabase, req.user.sub, 'item:unpin', { itemId: req.params.id });
                res.json({ ok: true });
            } catch (err) {
                console.error('pin delete error', err);
                sendJSONError(res, 500, 'Server error');
            }
        }
    );

    return router;
}