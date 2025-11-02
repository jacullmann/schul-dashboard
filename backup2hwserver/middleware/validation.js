// middleware/validation.js
import { body, param, query, validationResult } from 'express-validator';
import dayjs from 'dayjs';
import { sendJSONError } from '../utils/helpers.js';

export function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendJSONError(res, 400, 'Validation error', errors.array());
    next();
}

export function validateItemCreation(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMap = {
            'type': 'Ungültiger Eintrag',
            'title': 'Passe den Titel an (2-60 Zeichen)',
            'subject': 'Passe das Fach an (2-40 Zeichen)',
            'description': 'Die Beschreibung ist zu lang',
            'images': 'Du kannst maximal 12 Bilder hochladen',
            'dueDate': 'Ungültiges Datumsformat'
        };

        const firstError = errors.array()[0];
        const fieldName = firstError.param;
        const userFriendlyMessage = errorMap[fieldName] || `Ungültiger Wert für ${fieldName}`;

        return sendJSONError(res, 400, userFriendlyMessage, errors.array());
    }

    const { dueDate } = req.body;
    const now = dayjs();

    if (dayjs(dueDate).isBefore(now.subtract(2, 'day'))) {
        return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Vergangenheit');
    } else if (dayjs(dueDate).isAfter(now.add(365, 'day'))) {
        return sendJSONError(res, 400, 'Das Datum liegt zu weit in der Zukunft');
    }

    next();
}