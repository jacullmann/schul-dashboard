import { Router } from 'express';
import { body, param } from 'express-validator';

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
                    .sort({ createdAt: -1 })
                    .lean();

                const decryptedTodos = await Promise.all(todos.map(async todo => ({
                    id: todo._id,
                    title: await decryptData(todo.encryptedTitle, req.user.sub),
                    description: todo.encryptedDescription?.data
                        ? await decryptData(todo.encryptedDescription, req.user.sub)
                        : '',
                    completed: todo.completed,
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

                const encryptedTitle = await encryptData(title.trim(), req.user.sub);
                const encryptedDescription = await encryptData(description?.trim() || '', req.user.sub);

                const todo = await EncryptedTodo.create({
                    userId: req.user.sub,
                    encryptedTitle,
                    encryptedDescription,
                    completed: false
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
            body('description').optional().isString().isLength({ max: 1000 })
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
                    updatedAt: todo.updatedAt
                });

            } catch (error) {
                console.error('Fehler beim Umschalten des privaten Eintrag-Statuses:', error);
                sendJSONError(res, 500, 'Fehler beim Aktualisieren des privaten Eintrags');
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