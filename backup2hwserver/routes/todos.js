import { Router } from 'express';
import { body, param } from 'express-validator';
import { generateKeyBetween } from 'fractional-indexing';

export default function createTodosRoutes(deps) {
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
        validate,
        encryptData,
        decryptData
    } = deps;

    const { User, BannedUser, EncryptedTodo } = models;

    // GET /api/todos
    router.get('/',
        requireAppGate(appGateSecret),
        requireUser(userSecret, BannedUser, User),
        async (req, res) => {
            try {
                const todos = await EncryptedTodo.find({ userId: req.user.sub })
                    .sort({ position: 1, createdAt: -1 })
                    .lean();

                const decryptedTodos = await Promise.all(todos.map(async todo => ({
                    id: todo._id,
                    title: await decryptData(todo.encryptedTitle, req.user.sub),
                    description: todo.encryptedDescription?.data
                        ? await decryptData(todo.encryptedDescription, req.user.sub)
                        : '',
                    completed: todo.completed,
                    position: todo.position || '',
                    createdAt: todo.createdAt,
                    updatedAt: todo.updatedAt
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
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        [
            body('title').isString().isLength({ min: 1, max: 100 }),
            body('description').optional().isString().isLength({ max: 2000 })
        ],
        validate,
        async (req, res) => {
            try {
                const { title, description } = req.body;

                const firstTodo = await EncryptedTodo.findOne({ userId: req.user.sub })
                    .sort({ position: 1, createdAt: -1 })
                    .lean();

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

                const todo = await EncryptedTodo.create({
                    userId: req.user.sub,
                    encryptedTitle,
                    encryptedDescription,
                    completed: false,
                    position: newPosition
                });

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'todo:create',
                            meta: { todoId: todo._id }
                        }
                    }
                });

                res.status(201).json({
                    id: todo._id,
                    title: title.trim(),
                    description: description?.trim() || '',
                    completed: false,
                    position: newPosition,
                    createdAt: todo.createdAt,
                    updatedAt: todo.updatedAt
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
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        [
            param('id').isMongoId(),
            body('title').isString().isLength({ min: 1, max: 100 }),
            body('description').optional().isString().isLength({ max: 2000 })
        ],
        validate,
        async (req, res) => {
            try {
                const todo = await EncryptedTodo.findOne({
                    _id: req.params.id,
                    userId: req.user.sub
                });

                if (!todo) {
                    return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');
                }

                const { title, description } = req.body;

                todo.encryptedTitle = await encryptData(title.trim(), req.user.sub);
                todo.encryptedDescription = await encryptData(description?.trim() || '', req.user.sub);
                await todo.save();

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'todo:update',
                            meta: { todoId: todo._id }
                        }
                    }
                });

                res.json({
                    id: todo._id,
                    title: title.trim(),
                    description: description?.trim() || '',
                    completed: todo.completed,
                    position: todo.position || '',
                    createdAt: todo.createdAt,
                    updatedAt: todo.updatedAt
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
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const todo = await EncryptedTodo.findOne({
                    _id: req.params.id,
                    userId: req.user.sub
                });

                if (!todo) {
                    return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');
                }

                todo.completed = !todo.completed;
                await todo.save();

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'todo:toggle',
                            meta: {
                                todoId: todo._id,
                                completed: todo.completed
                            }
                        }
                    }
                });
                res.json({
                    id: todo._id,
                    completed: todo.completed,
                    position: todo.position || '',
                    updatedAt: todo.updatedAt
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
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        [
            param('id').isMongoId(),
            body('prevPosition').optional({ nullable: true }).isString(),
            body('nextPosition').optional({ nullable: true }).isString()
        ],
        validate,
        async (req, res) => {
            try {
                const todo = await EncryptedTodo.findOne({
                    _id: req.params.id,
                    userId: req.user.sub
                });

                if (!todo) {
                    return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');
                }

                const { prevPosition, nextPosition } = req.body;

                let newPosition;
                try {
                    newPosition = generateKeyBetween(prevPosition || null, nextPosition || null);
                } catch (e) {
                    return sendJSONError(res, 400, 'Ungültige Positionen für Re-Ordering');
                }

                todo.position = newPosition;
                await todo.save();

                // Rebalancing check: If the position string gets too long, re-assign positions for all incomplete todos
                if (newPosition && newPosition.length > 20) {
                    const allIncomplete = await EncryptedTodo.find({ userId: req.user.sub, completed: false })
                        .sort({ position: 1, createdAt: -1 });

                    let p = null;
                    for (const t of allIncomplete) {
                        try {
                            p = generateKeyBetween(p, null);
                            t.position = p;
                            await t.save();
                        } catch (e) {
                            // Ignore error and continue
                        }
                    }
                    if (todo._id) {
                        const updatedTodo = await EncryptedTodo.findById(todo._id);
                        if (updatedTodo) newPosition = updatedTodo.position;
                    }
                }

                res.json({
                    id: todo._id,
                    position: newPosition,
                    updatedAt: todo.updatedAt
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
        requireUser(userSecret, BannedUser, User),
        validateCsrf(csrfSecret),
        param('id').isMongoId(),
        validate,
        async (req, res) => {
            try {
                const todo = await EncryptedTodo.findOneAndDelete({
                    _id: req.params.id,
                    userId: req.user.sub
                });

                if (!todo) {
                    return sendJSONError(res, 404, 'Privater Eintrag nicht gefunden');
                }

                await User.findByIdAndUpdate(req.user.sub, {
                    $push: {
                        activity: {
                            at: new Date(),
                            type: 'todo:delete',
                            meta: { todoId: req.params.id }
                        }
                    }
                });

                res.json({ ok: true });
            } catch (error) {
                console.error('Fehler beim Löschen des To-Dos:', error);
                sendJSONError(res, 500, 'Fehler beim Löschen des privaten Eintrags');
            }
        }
    );

    return router;
}