import { Router } from 'express';
import { body, param } from 'express-validator';
import { generateKeyBetween } from 'fractional-indexing';
import * as db from '../db/db.js';

export default function createTodosRoutes(deps) {
    const router = Router();
    const {
        supabase,
        appGateSecret,
        userSecret,
        csrfSecret,
        requireAppGate,
        requireUser,
        validateCsrf,
        sendJSONError,
        validate,
        encryptData,
        decryptData,
    } = deps;

    // GET /api/todos
    router.get('/',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        async (req, res) => {
            try {
                const todos = await db.listTodos(supabase, req.user.sub);

                const decryptedTodos = await Promise.all(todos.map(async todo => ({
                    id: todo.id,
                    title: await decryptData(todo.encrypted_title, req.user.sub),
                    description: todo.encrypted_description?.data
                        ? await decryptData(todo.encrypted_description, req.user.sub)
                        : '',
                    completed: todo.completed,
                    position: todo.position || '',
                    createdAt: todo.created_at,
                    updatedAt: todo.updated_at,
                })));

                res.json(decryptedTodos);
            } catch (error) {
                console.error('Fehler beim Laden der privaten Einträge:', error);
                sendJSONError(res, 500, 'Fehler beim Laden der privaten Einträge');
            }
        }
    );

    // POST /api/todos
    router.post('/',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        [
            body('title').isString().isLength({ min: 1, max: 100 }),
            body('description').optional().isString().isLength({ max: 2000 }),
        ],
        validate,
        async (req, res) => {
            try {
                const { title, description } = req.body;

                const firstTodo = await db.getFirstTodo(supabase, req.user.sub);

                let newPosition;
                try {
                    newPosition = firstTodo && firstTodo.position
                        ? generateKeyBetween(null, firstTodo.position)
                        : generateKeyBetween(null, null);
                } catch (e) {
                    newPosition = generateKeyBetween(null, null);
                }

                const encryptedTitle = await encryptData(title.trim(), req.user.sub);
                const encryptedDescription = await encryptData(description?.trim() || '', req.user.sub);

                const todo = await db.createTodo(supabase, {
                    userId: req.user.sub,
                    encryptedTitle,
                    encryptedDescription,
                    position: newPosition,
                });

                await db.logActivity(supabase, req.user.sub, 'todo:create', { todoId: todo.id });

                res.status(201).json({
                    id: todo.id,
                    title: title.trim(),
                    description: description?.trim() || '',
                    completed: false,
                    position: newPosition,
                    createdAt: todo.created_at,
                    updatedAt: todo.updated_at,
                });
            } catch (error) {
                console.error('Fehler beim Erstellen des privaten Eintrags:', error);
                sendJSONError(res, 500, 'Fehler beim Erstellen des privaten Eintrags');
            }
        }
    );

    // PUT /api/todos/:id
    router.put('/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        [
            param('id').isUUID(),
            body('title').isString().isLength({ min: 1, max: 100 }),
            body('description').optional().isString().isLength({ max: 2000 }),
        ],
        validate,
        async (req, res) => {
            try {
                const todo = await db.findTodoById(supabase, req.params.id, req.user.sub);
                if (!todo) return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');

                const { title, description } = req.body;

                const encryptedTitle = await encryptData(title.trim(), req.user.sub);
                const encryptedDescription = await encryptData(description?.trim() || '', req.user.sub);

                const updated = await db.updateTodo(supabase, todo.id, {
                    encrypted_title: encryptedTitle,
                    encrypted_description: encryptedDescription,
                });

                await db.logActivity(supabase, req.user.sub, 'todo:update', { todoId: todo.id });

                res.json({
                    id: updated.id,
                    title: title.trim(),
                    description: description?.trim() || '',
                    completed: updated.completed,
                    position: updated.position || '',
                    createdAt: updated.created_at,
                    updatedAt: updated.updated_at,
                });
            } catch (error) {
                console.error('Fehler beim Aktualisieren des privaten Eintrags:', error);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren des privaten Eintrags');
            }
        }
    );

    // PATCH /api/todos/:id/toggle
    router.patch('/:id/toggle',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const todo = await db.findTodoById(supabase, req.params.id, req.user.sub);
                if (!todo) return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');

                const newCompleted = !todo.completed;
                const updated = await db.updateTodo(supabase, todo.id, { completed: newCompleted });

                await db.logActivity(supabase, req.user.sub, 'todo:toggle', {
                    todoId: todo.id,
                    completed: newCompleted,
                });

                res.json({
                    id: updated.id,
                    completed: updated.completed,
                    position: updated.position || '',
                    updatedAt: updated.updated_at,
                });
            } catch (error) {
                console.error('Fehler beim Umschalten des privaten Eintrag-Statuses:', error);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren des privaten Eintrags');
            }
        }
    );

    // PATCH /api/todos/:id/reorder
    router.patch('/:id/reorder',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        [
            param('id').isUUID(),
            body('prevPosition').optional({ nullable: true }).isString(),
            body('nextPosition').optional({ nullable: true }).isString(),
        ],
        validate,
        async (req, res) => {
            try {
                const todo = await db.findTodoById(supabase, req.params.id, req.user.sub);
                if (!todo) return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');

                const { prevPosition, nextPosition } = req.body;

                let newPosition;
                try {
                    newPosition = generateKeyBetween(prevPosition || null, nextPosition || null);
                } catch (e) {
                    return sendJSONError(res, 400, 'Ungültige Positionen für Re-Ordering');
                }

                await db.updateTodo(supabase, todo.id, { position: newPosition });

                // Rebalancing check
                if (newPosition && newPosition.length > 20) {
                    const allIncomplete = await db.listIncompleteTodos(supabase, req.user.sub);
                    let p = null;
                    for (const t of allIncomplete) {
                        try {
                            p = generateKeyBetween(p, null);
                            await db.updateTodo(supabase, t.id, { position: p });
                        } catch (e) {
                            // Ignore and continue
                        }
                    }
                    // Refresh position after rebalance
                    const refreshed = await db.findTodoById(supabase, todo.id, req.user.sub);
                    if (refreshed) newPosition = refreshed.position;
                }

                res.json({
                    id: todo.id,
                    position: newPosition,
                    updatedAt: todo.updated_at,
                });
            } catch (error) {
                console.error('Fehler beim Neuordnen des privaten Eintrags:', error);
                sendJSONError(res, 500, 'Fehler beim Neuordnen des privaten Eintrags');
            }
        }
    );

    // DELETE /api/todos/:id
    router.delete('/:id',
        requireAppGate(appGateSecret),
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        param('id').isUUID(),
        validate,
        async (req, res) => {
            try {
                const todo = await db.findTodoById(supabase, req.params.id, req.user.sub);
                if (!todo) return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');

                await db.deleteTodo(supabase, req.params.id, req.user.sub);
                await db.logActivity(supabase, req.user.sub, 'todo:delete', { todoId: req.params.id });

                res.json({ ok: true });
            } catch (error) {
                console.error('Fehler beim Löschen des To-Dos:', error);
                sendJSONError(res, 500, 'Fehler beim Löschen des privaten Eintrags');
            }
        }
    );

    return router;
}