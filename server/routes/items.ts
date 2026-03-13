import type { Request, Response } from 'express';
// routes/items.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import dayjs from 'dayjs';
import * as db from '../db/db.js';
import type { RouteDeps, ItemImage } from '../types/index.js';
import { generateUserName } from '../utils/nameGenerator.js';

export default function createItemsRoutes(deps: RouteDeps): Router {
  const router = Router();
  const {
    supabase,
    cloudinary,
    authSecret,
    requireAuth,
    requireTenant,
    validateCsrf,
    sendJSONError,
    validate,
    validateItemCreation,
    withThumb,
    timeLeftColor,
  } = deps;

  const auth = [requireAuth(authSecret, supabase), requireTenant(supabase)];

  // GET /api/items
  router.get(
    '/',
    ...auth,
    query('type').isIn(['homework', 'dalton', 'exam', 'all']),
    query('filter').optional().isIn(['old']),
    validate,
    async (req: Request, res: Response) => {
      try {
        const rows = await db.listItems(supabase, req.tenantId!, {
          type: req.query.type as string,
          filter: req.query.filter as string | undefined,
          limit: 100,
          userId: req.userId,
        });
        res.json(
          rows.map((row) => ({
            id: row.id,
            type: row.type,
            title: row.title,
            subject: row.subject,
            description: row.description,
            images: (row.images || []).map((img) => withThumb(img)),
            dueDate: row.due_date,
            createdBy: row.created_by,
            createdByEmail: row.creator?.email || 'Unbekannt',
            createdByName: generateUserName(row.created_by, req.tenantId!),
            timeColor: timeLeftColor(row.due_date),
            editorNote: row.editor_note || '',
          })),
        );
      } catch (err) {
        console.error('Error loading items:', err);
        sendJSONError(res, 500, 'Fehler beim Laden der Einträge');
      }
    },
  );

  // GET /api/items/:id
  router.get(
    '/:id',
    ...auth,
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const row = await db.findItemById(
          supabase,
          req.tenantId!,
          req.params.id!,
        );
        if (!row) {
          sendJSONError(res, 404, 'Eintrag nicht gefunden');
          return;
        }
        const creator = await db.findUserById(
          supabase,
          row.created_by,
          'email',
        );
        res.json({
          id: row.id,
          type: row.type,
          title: row.title,
          subject: row.subject,
          description: row.description,
          images: (row.images || []).map((img) => withThumb(img)),
          dueDate: row.due_date,
          createdBy: row.created_by,
          createdByEmail: (creator?.email as string) || 'Unbekannt',
          createdByName: generateUserName(row.created_by, req.tenantId!),
          timeColor: timeLeftColor(row.due_date),
          editorNote: row.editor_note || '',
        });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Laden des Eintrags');
      }
    },
  );

  // POST /api/items
  router.post(
    '/',
    ...auth,
    validateCsrf(),
    [
      body('type').isIn(['homework', 'dalton', 'exam']).withMessage('type'),
      body('title')
        .isString()
        .isLength({ min: 1, max: 60 })
        .withMessage('title'),
      body('subject')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('subject'),
      body('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('description'),
      body('images').optional().isArray({ max: 8 }).withMessage('images'),
      body('dueDate').isISO8601().toDate().withMessage('dueDate'),
    ],
    validateItemCreation,
    async (req: Request, res: Response) => {
      try {
        const b = req.body as {
          type: string;
          title: string;
          subject: string;
          description?: string;
          images?: Array<{
            publicId?: string;
            metadata?: Record<string, unknown>;
          }>;
          dueDate: string;
        };
        const rawImages = b.images || [];
        for (const img of rawImages) {
          if (!img.publicId) {
            sendJSONError(res, 400, 'Fehlendes publicId im Bild');
            return;
          }
        }
        const images: ItemImage[] = rawImages.map((img) => ({
          publicId: img.publicId!,
          createdBy: req.userId!,
          metadata: img.metadata || {},
        }));

        const item = await db.createItem(supabase, req.tenantId!, {
          type: b.type as 'homework' | 'dalton' | 'exam',
          title: b.title.trim(),
          subject: b.subject.trim(),
          description: (b.description || '').trim(),
          images,
          dueDate: b.dueDate,
          createdBy: req.userId!,
        });
        await db.logActivity(supabase, req.userId!, 'item:create', {
          id: item.id,
          type: item.type,
        });
        res.status(201).json({ ok: true, id: item.id });
      } catch (err) {
        console.error('Item creation error:', err);
        sendJSONError(res, 500, 'Fehler beim Erstellen des Eintrags');
      }
    },
  );

  // PATCH /api/items/:id
  router.patch(
    '/:id',
    ...auth,
    validateCsrf(),
    param('id').isUUID(),
    body('title').optional().isString().isLength({ min: 2, max: 60 }),
    body('subject').optional().isString().isLength({ min: 2, max: 100 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('images').optional().isArray({ max: 12 }),
    body('dueDate').optional().isISO8601().toDate(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const item = await db.findItemById(
          supabase,
          req.tenantId!,
          req.params.id!,
        );
        if (!item) {
          sendJSONError(res, 404, 'Nicht gefunden');
          return;
        }
        if (item.created_by !== req.userId) {
          sendJSONError(
            res,
            403,
            'Nur der Ersteller kann diesen Eintrag bearbeiten.',
          );
          return;
        }

        const b = req.body as {
          title?: string;
          subject?: string;
          description?: string;
          images?: Array<{
            publicId?: string;
            createdBy?: string;
            metadata?: Record<string, unknown>;
          }>;
          dueDate?: string;
        };

        if (b.dueDate) {
          const due = dayjs(b.dueDate);
          if (due.isBefore(dayjs().subtract(2, 'day'))) {
            sendJSONError(res, 400, 'Datum liegt zu weit in der Vergangenheit');
            return;
          }
          if (due.isAfter(dayjs().add(365, 'day'))) {
            sendJSONError(res, 400, 'Datum liegt zu weit in der Zukunft');
            return;
          }
        }

        if (b.images) {
          if (b.images.length > 12) {
            sendJSONError(res, 400, 'Max 12 Bilder');
            return;
          }
          const userCount = b.images.filter(
            (i) => i.createdBy === req.userId || !i.createdBy,
          ).length;
          if (userCount > 8) {
            sendJSONError(res, 400, 'Max 8 eigene Bilder');
            return;
          }
        }

        const update: Record<string, unknown> = {};
        if (b.title !== undefined) update.title = b.title;
        if (b.subject !== undefined) update.subject = b.subject;
        if (b.description !== undefined) update.description = b.description;
        if (b.dueDate !== undefined) update.due_date = b.dueDate;
        if (b.images !== undefined) {
          for (const img of b.images) {
            if (!img.publicId) {
              sendJSONError(res, 400, 'Fehlendes publicId');
              return;
            }
          }
          update.images = b.images.map((img) => ({
            publicId: img.publicId,
            createdBy: img.createdBy || req.userId,
            metadata: img.metadata || {},
          }));
        }

        await db.updateItem(supabase, req.tenantId!, item.id, update);
        await db.logActivity(supabase, req.userId, 'item:update', {
          id: item.id,
        });
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Aktualisieren');
      }
    },
  );

  // DELETE /api/items/:id
  router.delete(
    '/:id',
    ...auth,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const item = await db.findItemById(
          supabase,
          req.tenantId!,
          req.params.id!,
        );
        if (!item) {
          sendJSONError(res, 404, 'Nicht gefunden');
          return;
        }
        const isSuperadmin = req.user!.globalRole === 'superadmin';
        const isGroupAdmin =
          req.tenantRole === 'admin' || req.tenantRole === 'moderator';
        if (!isSuperadmin && !isGroupAdmin && item.created_by !== req.userId) {
          sendJSONError(res, 403, 'Nicht autorisiert.');
          return;
        }

        if (item.images?.length > 0) {
          const pids = item.images.map((i) => i.publicId).filter(Boolean);
          if (pids.length) {
            try {
              await cloudinary.api.delete_resources(pids);
            } catch (e) {
              console.error('Cloudinary error', e);
            }
          }
        }

        await db.deleteItem(supabase, req.tenantId!, item.id);
        await db.logActivity(supabase, req.userId!, 'item:delete', {
          id: item.id,
        });
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Löschen');
      }
    },
  );

  // PATCH /api/items/:id/note (admin/moderator only)
  router.patch(
    '/:id/note',
    requireAuth(authSecret, supabase, ['admin', 'moderator']),
    validateCsrf(),
    param('id').isUUID(),
    body('editorNote').isString().isLength({ max: 2000 }),
    validate,
    async (req: Request, res: Response) => {
      try {
        const item = await db.findItemById(
          supabase,
          req.tenantId!,
          req.params.id!,
        );
        if (!item) {
          sendJSONError(res, 404, 'Nicht gefunden');
          return;
        }
        const noteContent = (
          req.body as { editorNote: string }
        ).editorNote.trim();
        await db.updateItem(supabase, req.tenantId!, item.id, {
          editor_note: noteContent,
        });
        await db.logActivity(supabase, req.userId!, 'item:note:update', {
          itemId: item.id,
        });
        res.json({ ok: true, editorNote: noteContent });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Speichern');
      }
    },
  );

  // POST /api/items/:id/images
  router.post(
    '/:id/images',
    ...auth,
    validateCsrf(),
    param('id').isUUID(),
    body('image').isObject(),
    body('image.publicId').isString(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const item = await db.findItemById(
          supabase,
          req.tenantId!,
          req.params.id!,
        );
        if (!item) {
          sendJSONError(res, 404, 'Nicht gefunden');
          return;
        }
        const images = item.images || [];
        if (images.length >= 12) {
          sendJSONError(res, 400, 'Max 12 Bilder');
          return;
        }
        const userCount = images.filter(
          (i) => i.createdBy === req.userId,
        ).length;
        if (userCount >= 8) {
          sendJSONError(res, 400, 'Max 8 eigene Bilder');
          return;
        }

        const imgBody = (
          req.body as {
            image: { publicId: string; metadata?: Record<string, unknown> };
          }
        ).image;
        const newImage: ItemImage = {
          publicId: imgBody.publicId,
          createdBy: req.userId!,
          metadata: imgBody.metadata || {},
        };
        images.push(newImage);
        await db.updateItem(supabase, req.tenantId!, item.id, { images });
        await db.logActivity(supabase, req.userId!, 'item:image:add', {
          itemId: item.id,
        });
        res.status(201).json({ ok: true, image: withThumb(newImage) });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Hinzufügen');
      }
    },
  );

  // DELETE /api/items/:itemId/images/:publicId
  router.delete(
    '/:itemId/images/:publicId',
    ...auth,
    validateCsrf(),
    param('itemId').isUUID(),
    param('publicId').isString(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const item = await db.findItemById(
          supabase,
          req.tenantId!,
          req.params.itemId!,
        );
        if (!item) {
          sendJSONError(res, 404, 'Nicht gefunden');
          return;
        }

        let publicId: string;
        try {
          publicId = decodeURIComponent(req.params.publicId!);
        } catch {
          publicId = req.params.publicId!;
        }

        const images = item.images || [];
        const idx = images.findIndex((i) => i.publicId === publicId);
        if (idx === -1) {
          sendJSONError(res, 404, 'Bild nicht gefunden');
          return;
        }

        const image = images[idx]!;
        const isSuperadmin = req.user!.globalRole === 'superadmin';
        const isGroupAdmin =
          req.tenantRole === 'admin' || req.tenantRole === 'moderator';
        const isImageOwner = image.createdBy === req.userId;
        const isItemOwner = item.created_by === req.userId;
        if (!isSuperadmin && !isGroupAdmin && !isImageOwner && !isItemOwner) {
          sendJSONError(res, 403, 'Nicht autorisiert.');
          return;
        }

        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (e) {
          console.error('Cloudinary error', e);
        }

        images.splice(idx, 1);
        await db.updateItem(supabase, req.tenantId!, item.id, { images });
        await db.logActivity(supabase, req.userId!, 'item:image:delete', {
          itemId: item.id,
        });
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Löschen');
      }
    },
  );

  // POST /api/items/reports
  router.post(
    '/reports',
    requireAuth(authSecret, supabase),
    validateCsrf(),
    body('itemId').isUUID(),
    body('itemTitle').isString().isLength({ min: 1, max: 200 }),
    body('category').isIn(['illegal', 'falschinfo']),
    body('reason').optional().isString().isLength({ max: 5000 }),
    validate,
    async (req: Request, res: Response) => {
      try {
        const { itemId, itemTitle, category, reason } = req.body as {
          itemId: string;
          itemTitle: string;
          category: 'illegal' | 'falschinfo';
          reason?: string;
        };
        if (category === 'falschinfo' && (!reason || !reason.trim())) {
          sendJSONError(res, 400, 'Bitte füge einen Grund hinzu.');
          return;
        }
        await db.createReport(supabase, {
          itemId,
          itemTitle,
          category,
          reason: reason?.trim() || null,
          reporterId: req.userId,
          reporterEmail: req.user!.email,
        });
        await db.logActivity(supabase, req.userId!, 'item:report', {
          itemId,
          category,
        });
        res
          .status(201)
          .json({ ok: true, message: 'Eintrag erfolgreich gemeldet.' });
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  // POST /api/items/uploads/sign
  router.post(
    '/uploads/sign',
    requireAuth(authSecret, supabase),
    validateCsrf(),
    async (_req: Request, res: Response) => {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = cloudinary.utils.api_sign_request(
          {
            timestamp,
            folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben',
          },
          process.env.CLOUDINARY_API_SECRET!,
        );
        res.json({
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY,
          timestamp,
          signature,
          folder: process.env.CLOUDINARY_FOLDER || 'hausaufgaben',
        });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Erstellen der Upload-Signatur');
      }
    },
  );

  return router;
}
